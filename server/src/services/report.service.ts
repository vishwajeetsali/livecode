import Groq from "groq-sdk";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { ForbiddenError, NotFoundError } from "../errors/AppError.js";
import { logger } from "../utils/logger.js";

const groq = new Groq({ apiKey: env.GROQ_API_KEY || "dummy_key" });

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

function detectUnedited(code: string): boolean {
    if (!code || code.trim().length === 0) return true;
    if (code.trim() === "// Start coding here...") return true;

    const meaningfulLines = code
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => {
            if (!l) return false;
            if (l.startsWith("//") || l.startsWith("#") || l.startsWith("/*") || l.startsWith("*")) return false;
            if (/^(pass|return null;?|return nil;?|return "";?|return 0;?|return \{\};?)$/.test(l)) return false;
            if (/^[\{\}]$/.test(l)) return false;
            return true;
        });

    const codeBody = meaningfulLines.join("\n")
        .replace(/function\s+\w+\s*\([^)]*\)\s*\{?/g, "")
        .replace(/def\s+\w+\s*\([^)]*\)\s*:/g, "")
        .replace(/public\s+(static\s+)?\w[\w<>\[\]]*\s+\w+\s*\([^)]*\)/g, "")
        .replace(/class\s+Solution\s*(\{|:)?/g, "")
        .replace(/var\s+\w+\s*=\s*function\s*\([^)]*\)\s*\{/g, "")
        .trim();

    return codeBody.length < 8;
}

function applyObjectiveScoreCaps(
    ai: { codeScore: number; communicationScore: number; problemSolvingScore: number; verdict: string },
    signals: {
        isCodeUnedited: boolean;
        hasTranscript: boolean;
        runCount: number;
        hintCount: number;
        elapsed: number;
        timeLimit: number;
    }
): { codeScore: number; communicationScore: number; problemSolvingScore: number; verdict: string } {
    let { codeScore, communicationScore, problemSolvingScore } = ai;

    if (signals.isCodeUnedited) {
        codeScore = 0;
    } else {
        codeScore = Math.min(codeScore, 100);
    }

    if (!signals.hasTranscript && signals.isCodeUnedited) {
        communicationScore = 0;
    } else if (!signals.hasTranscript) {
        communicationScore = Math.min(communicationScore, 25);
    } else {
        communicationScore = Math.min(communicationScore, 100);
    }

    if (signals.isCodeUnedited && signals.runCount === 0) {
        problemSolvingScore = 0;
    } else if (signals.runCount === 0) {
        problemSolvingScore = Math.min(problemSolvingScore, 30);
    } else {
        const hintPenalty = Math.max(0, signals.hintCount - 2) * 5;
        problemSolvingScore = Math.max(0, Math.min(problemSolvingScore, 100) - hintPenalty);
    }

    const avg = (codeScore + communicationScore + problemSolvingScore) / 3;
    let verdict = ai.verdict;
    if (avg < 55) verdict = "No Hire";
    else if (avg < 75) verdict = "Hire";
    else verdict = "Strong Hire";

    return { codeScore, communicationScore, problemSolvingScore, verdict };
}

function formatTips(raw: any): string {
    if (Array.isArray(raw)) {
        return raw.map((t) => (typeof t === "string" ? t : JSON.stringify(t))).join("\n• ");
    }
    if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
    return "Practice verbalising your approach and test your solution against edge cases.";
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

interface GenerateParams {
    sessionId: string;
    code?: string;
    problem?: string;
    transcript?: string;
    fillerCount?: number;
    elapsed?: number;
    hintCount?: number;
    runCount?: number;
    timeLimit?: number;
}

export const ReportService = {
    async generate(params: GenerateParams, userId: string) {
        const {
            sessionId,
            code,
            problem,
            transcript,
            fillerCount,
            elapsed = 0,
            hintCount = 0,
            runCount = 0,
            timeLimit = 0,
        } = params;

        // ── Ownership check: only session participant or room creator ────────
        const targetSession = await prisma.session.findUnique({
            where: { id: sessionId },
            select: { userId: true, room: { select: { userId: true } } },
        });
        if (!targetSession) throw new NotFoundError("Session not found");
        if (targetSession.userId !== userId && targetSession.room.userId !== userId) {
            throw new ForbiddenError("You are not authorized to generate a report for this session");
        }

        // ── Idempotency check: return existing report if already generated ───
        const existingReport = await prisma.report.findUnique({
            where: { sessionId },
        });
        if (existingReport) {
            return existingReport;
        }

        const trimmedCode = code ? code.trim() : "";
        const hasTranscript = Boolean(transcript && transcript.trim().length > 0);
        const isCodeUnedited = detectUnedited(trimmedCode);
        const safeFillerCount = typeof fillerCount === "number" ? fillerCount : 0;

        const signals = {
            isCodeUnedited,
            hasTranscript,
            runCount: Number(runCount) || 0,
            hintCount: Number(hintCount) || 0,
            elapsed: Number(elapsed) || 0,
            timeLimit: Number(timeLimit) || 0,
        };

        // ── Completely unattempted — skip AI entirely ─────────────────────────
        let parsed: any;

        if (isCodeUnedited && !hasTranscript && signals.runCount === 0) {
            parsed = {
                codeScore: 0,
                communicationScore: 0,
                problemSolvingScore: 0,
                approach: "No solution was attempted and no verbal explanation was provided.",
                verdict: "No Hire",
                tips: "Start by talking through your understanding of the problem before writing any code. Even a brute-force first attempt shows problem-solving intent.",
                strengths: [],
                weaknesses: [
                    "No code written — starter template left unmodified",
                    "No verbal communication recorded during the session",
                    "Zero execution attempts made",
                ],
            };
        } else {
            // ── Ask AI for qualitative analysis ──────────────────────────────
            try {
                const timeText =
                    signals.timeLimit > 0
                        ? `${signals.elapsed}s used out of ${signals.timeLimit * 60}s (${Math.round((signals.elapsed / (signals.timeLimit * 60)) * 100)}% of allotted time)`
                        : `${signals.elapsed}s elapsed (no time limit)`;

                const completion = await groq.chat.completions.create({
                    model: "llama-3.1-8b-instant",
                    response_format: { type: "json_object" },
                    messages: [
                        {
                            role: "system",
                            content: `You are a senior FAANG engineering interview panel evaluator. Your job is to assess a coding interview session and produce a JSON evaluation.

Scoring dimensions — provide raw scores (0-100) based purely on what you observe in the code and transcript. Do NOT inflate scores:
- codeScore: actual correctness and algorithm quality of the submitted code
- communicationScore: clarity of verbal explanation (transcript) and inline code comments combined
- problemSolvingScore: structured approach, self-correction ability, and efficiency given the time constraints

Return ONLY this JSON structure with no markdown or extra text:
{
  "codeScore": <integer 0-100>,
  "communicationScore": <integer 0-100>,
  "problemSolvingScore": <integer 0-100>,
  "approach": "<1-2 sentences describing what algorithmic strategy the candidate used>",
  "verdict": "<Strong Hire|Hire|No Hire>",
  "tips": "<2-3 specific, actionable improvement tips as a single string>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"]
}`,
                        },
                        {
                            role: "user",
                            content: `Problem: ${problem || "Coding Challenge"}
Time Used: ${timeText}
Hints Requested: ${signals.hintCount}
Code Runs / Submissions: ${signals.runCount}
Filler Words: ${safeFillerCount}
Audio Transcript: ${hasTranscript ? `"${transcript}"` : "NONE — candidate did not speak"}

Submitted Code:
\`\`\`
${trimmedCode || "(empty)"}
\`\`\``,
                        },
                    ],
                });

                let raw = completion.choices[0]?.message?.content || "{}";
                raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
                parsed = JSON.parse(raw);
            } catch (aiErr) {
                logger.warn("AI report evaluation fallback triggered", { error: (aiErr as Error)?.message });
                parsed = {
                    codeScore: isCodeUnedited ? 0 : 45,
                    communicationScore: hasTranscript ? 50 : (isCodeUnedited ? 0 : 15),
                    problemSolvingScore: signals.runCount > 0 ? 40 : 0,
                    approach: isCodeUnedited ? "No solution attempted." : "Candidate attempted an implementation.",
                    verdict: "No Hire",
                    tips: "Practise articulating your approach verbally and verify your solution with edge cases.",
                    strengths: isCodeUnedited ? [] : ["Made an attempt at coding a solution"],
                    weaknesses: hasTranscript ? ["Improve code documentation"] : ["No verbal communication recorded"],
                };
            }
        }

        // ── Apply objective caps regardless of AI output ──────────────────────
        const capped = applyObjectiveScoreCaps(
            {
                codeScore: typeof parsed.codeScore === "number" ? parsed.codeScore : 0,
                communicationScore: typeof parsed.communicationScore === "number" ? parsed.communicationScore : 0,
                problemSolvingScore: typeof parsed.problemSolvingScore === "number" ? parsed.problemSolvingScore : 0,
                verdict: typeof parsed.verdict === "string" ? parsed.verdict : "No Hire",
            },
            signals
        );

        const reportData = {
            codeScore: capped.codeScore,
            communicationScore: capped.communicationScore,
            problemSolvingScore: capped.problemSolvingScore,
            approach: typeof parsed.approach === "string" ? parsed.approach : "No approach provided.",
            verdict: capped.verdict,
            tips: formatTips(parsed.tips),
            strengths: Array.isArray(parsed.strengths)
                ? parsed.strengths.map((s: any) => (typeof s === "string" ? s : JSON.stringify(s)))
                : [],
            weaknesses: Array.isArray(parsed.weaknesses)
                ? parsed.weaknesses.map((w: any) => (typeof w === "string" ? w : JSON.stringify(w)))
                : [],
            transcript: transcript || "",
            fillerWords: safeFillerCount,
        };

        logger.info("Report scores after objective capping", {
            sessionId,
            isCodeUnedited,
            hasTranscript,
            runCount: signals.runCount,
            scores: { code: capped.codeScore, comm: capped.communicationScore, ps: capped.problemSolvingScore },
            verdict: capped.verdict,
        });

        const report = await prisma.report.upsert({
            where: { sessionId },
            update: reportData,
            create: { sessionId, ...reportData },
        });

        // Propagate to co-participant sessions (interviewer side) and persist room problem title
        try {
            const targetSession = await prisma.session.findUnique({
                where: { id: sessionId },
                include: { room: true },
            });
            if (targetSession) {
                if (problem && (!targetSession.room.problem || targetSession.room.mode === "MOCK")) {
                    await prisma.room.update({
                        where: { id: targetSession.roomId },
                        data: { problem },
                    });
                }

                const coSessions = await prisma.session.findMany({
                    where: { roomId: targetSession.roomId, id: { not: targetSession.id } },
                });
                for (const coSess of coSessions) {
                    await prisma.report.upsert({
                        where: { sessionId: coSess.id },
                        update: reportData,
                        create: { sessionId: coSess.id, ...reportData },
                    });
                }
            }
        } catch (e) {
            logger.warn("Failed to propagate report to co-sessions", { error: (e as Error)?.message });
        }

        return report;
    },

    async getBySessionId(sessionId: string, userId: string) {
        const report = await prisma.report.findUnique({
            where: { sessionId },
            include: { session: { include: { room: true } } },
        });

        if (!report) throw new NotFoundError("Report not found");

        const isCandidate = report.session.userId === userId;
        const isInterviewerOwner = report.session.room.userId === userId;

        if (!isCandidate && !isInterviewerOwner) {
            throw new ForbiddenError("You are not authorized to view this report");
        }

        return report;
    },
};
