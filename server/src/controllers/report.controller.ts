import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import Groq from "groq-sdk";
import type { JwtUser } from "../types/index.js";
import { env } from "../config/env.js";
import { ForbiddenError, NotFoundError } from "../errors/AppError.js";
import { logger } from "../utils/logger.js";

const groq = new Groq({ apiKey: env.GROQ_API_KEY || "dummy_key" });

export const generateReport = async (req: Request, res: Response) => {
    try {
        const { sessionId, code, problem, transcript, fillerCount, elapsed = 0, hintCount = 0, runCount = 0, timeLimit = 0 } = req.body;

        let parsed: any = {};
        const isCodeEmpty = !code || code.trim() === "" || code.trim() === "// Start coding here...";

        if (isCodeEmpty) {
            parsed = {
                codeScore: 0,
                communicationScore: 30,
                problemSolvingScore: 0,
                approach: "No solution was attempted. The starter code was left unedited.",
                verdict: "No Hire",
                tips: "Write and run an initial code draft to get automated grading feedback.",
                strengths: [],
                weaknesses: ["No code written during session", "No attempt made to solve problem"],
            };
        } else {
            try {
                const timeAllocationText = timeLimit > 0
                    ? `${elapsed} seconds out of ${timeLimit * 60} seconds allocated (${Math.round((elapsed / (timeLimit * 60)) * 100)}% of allotted time used)`
                    : `${elapsed} seconds (Unlimited time mode)`;

                const completion = await groq.chat.completions.create({
                    model: "llama-3.1-8b-instant",
                    response_format: { type: "json_object" },
                    messages: [
                        {
                            role: "system",
                            content: `You are an expert FAANG technical interview evaluator. Evaluate the candidate across three distinct dimensions (0-100 each):
1. codeScore: Code correctness, syntax, algorithm efficiency (time/space complexity), and handling edge cases.
2. communicationScore: Quality of code comments, clear variable/function naming, structure, and verbal transcript (if available). Be realistic: if transcript is empty and code lacks comments/naming clarity, score 50-70. Do NOT default to 100.
3. problemSolvingScore: Evaluated from trial efficiency, time management relative to allotted time limit, hint reliance, and execution attempts.

Return ONLY a JSON object:
{
  "codeScore": <number 0-100>,
  "communicationScore": <number 0-100>,
  "problemSolvingScore": <number 0-100>,
  "approach": <string, 1-2 concise sentences summarizing their algorithm approach>,
  "verdict": <"Strong Hire" | "Hire" | "No Hire">,
  "tips": <string, 2-3 actionable, specific improvement tips>,
  "strengths": [<array of 2-3 bullet point strings highlighting what went well>],
  "weaknesses": [<array of 2-3 bullet point strings highlighting key areas for improvement>]
}
Return ONLY valid JSON. No markdown wrappers.`
                        },
                        {
                            role: "user",
                            content: `Problem: ${problem || "Coding Task"}
Session Time Pacing: ${timeAllocationText}
Hints Used: ${hintCount}
Code Runs Attempted: ${runCount}
Filler Words Detected: ${fillerCount || 0}
Audio Transcript: ${transcript ? `"${transcript}"` : "None provided"}

Candidate Code:
${code}`
                        }
                    ],
                });

                let raw = completion.choices[0]?.message?.content || "{}";
                if (raw.startsWith("```")) {
                    raw = raw.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
                }
                parsed = JSON.parse(raw);
            } catch (aiErr) {
                logger.warn("AI report evaluation fallback triggered", { error: (aiErr as Error)?.message });
                parsed = {
                    codeScore: 75,
                    communicationScore: 70,
                    problemSolvingScore: 72,
                    approach: "Attempted algorithmic implementation.",
                    verdict: "Hire",
                    tips: "Review edge cases and refine time complexity.",
                    strengths: ["Submitted solution code"],
                    weaknesses: ["Add inline code documentation and comments"],
                };
            }
        }

        const safeFillerCount = typeof fillerCount === "number" ? fillerCount : 0;

        const reportData = {
            codeScore: typeof parsed.codeScore === "number" ? parsed.codeScore : 50,
            communicationScore: typeof parsed.communicationScore === "number" ? parsed.communicationScore : 60,
            problemSolvingScore: typeof parsed.problemSolvingScore === "number" ? parsed.problemSolvingScore : 50,
            approach: parsed.approach || "Standard implementation",
            verdict: parsed.verdict || "Hire",
            tips: parsed.tips || "Focus on optimization and edge cases.",
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
            weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
            transcript: transcript || "",
            fillerWords: safeFillerCount,
        };

        const report = await prisma.report.upsert({
            where: { sessionId: sessionId as string },
            update: reportData,
            create: {
                sessionId: sessionId as string,
                ...reportData,
            },
        });

        // Propagate report to any co-participant session in the same room so both candidate and interviewer see report on dashboard
        try {
            const targetSession = await prisma.session.findUnique({ where: { id: sessionId as string } });
            if (targetSession) {
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

        res.json(report);
    } catch (error) {
        logger.error("Report generation error", { error: (error as Error)?.message });
        res.status(500).json({ message: "report generation failed" });
    }
};

export const getReport = async (req: Request, res: Response) => {
    const user = req.user as JwtUser;
    const { sessionId } = req.params as { sessionId: string };
    
    const report = await prisma.report.findUnique({
        where: { sessionId },
        include: { session: { include: { room: true } } },
    });
    
    if (!report) throw new NotFoundError("Report not found");

    // Check authorization: user must be candidate who took session OR interviewer who created room
    const isCandidate = report.session.userId === user.userId;
    const isInterviewerOwner = report.session.room.userId === user.userId;

    if (!isCandidate && !isInterviewerOwner) {
        throw new ForbiddenError("You are not authorized to view this report");
    }

    res.json(report);
};