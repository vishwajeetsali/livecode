import Groq from "groq-sdk";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const groq = new Groq({ apiKey: env.GROQ_API_KEY || "dummy_key" });

export interface ReviewComment {
    line: number;
    severity: "info" | "warning" | "error";
    message: string;
}

export const ReviewService = {
    async reviewCode(code: string, problem: string, language: string): Promise<ReviewComment[]> {
        try {
            const response = await groq.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: `You are a senior code reviewer. Analyze the given code and return a JSON array of inline review comments.

Each comment must have:
- "line": the 1-based line number the comment refers to
- "severity": one of "info", "warning", or "error"
- "message": a concise review comment (max 100 chars)

Focus on:
- Logic errors and bugs
- Edge cases not handled
- Time/space complexity issues
- Style and readability issues

Return ONLY a valid JSON array, no markdown, no explanation. Example:
[{"line": 3, "severity": "warning", "message": "Missing null check for empty input"}, {"line": 7, "severity": "error", "message": "Off-by-one error in loop bound"}]

If the code is perfect, return an empty array: []
Return at most 8 comments.`,
                    },
                    {
                        role: "user",
                        content: `Problem: ${problem}\nLanguage: ${language}\n\nCode:\n${code}`,
                    },
                ],
                temperature: 0.3,
                max_tokens: 1024,
            });

            const raw = response.choices[0]?.message?.content?.trim() || "[]";

            // Extract JSON array from response (handle markdown code fences)
            let jsonStr = raw;
            const jsonMatch = raw.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }

            const parsed = JSON.parse(jsonStr);

            if (!Array.isArray(parsed)) return [];

            const totalLines = Math.max(1, code.split("\n").length);

            // Validate and sanitize each comment
            return parsed
                .filter(
                    (c: unknown): c is ReviewComment =>
                        typeof c === "object" &&
                        c !== null &&
                        typeof (c as ReviewComment).line === "number" &&
                        typeof (c as ReviewComment).message === "string" &&
                        ["info", "warning", "error"].includes((c as ReviewComment).severity)
                )
                .slice(0, 8)
                .map((c) => ({
                    line: Math.max(1, Math.min(Math.round(c.line), totalLines)),
                    severity: c.severity,
                    message: c.message.slice(0, 150),
                }));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error("AI code review failed", { error: message });
            return [];
        }
    },
};
