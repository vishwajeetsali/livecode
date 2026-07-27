import { z } from "zod";

// ─── Auth ────────────────────────────────────────────────────────────────────
// (OAuth routes have no body to validate)

// ─── Rooms ───────────────────────────────────────────────────────────────────
export const createRoomSchema = z.object({
    mode: z.enum(["LIVE", "MOCK", "REAL"]).default("LIVE"),
});

export const joinRoomSchema = z.object({
    roomId: z.string().min(1, "roomId is required"),
});

export const setRoomProblemSchema = z.object({
    roomId: z.string().min(1, "roomId is required"),
    problem: z.string().min(1, "problem is required"),
});

export const endSessionSchema = z.object({
    roomId: z.string().min(1, "roomId is required"),
});

export const executeCodeSchema = z.object({
    code: z.string().min(1, "code is required"),
    languageId: z.number().int().positive(),
    stdin: z.string().default(""),
});

// ─── AI Hint ─────────────────────────────────────────────────────────────────
export const aiHintSchema = z.object({
    code: z.string().min(1, "code is required"),
    problem: z.string().min(1, "problem is required"),
});

// ─── Mock ─────────────────────────────────────────────────────────────────────
export const mockQuestionSchema = z.object({
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
    role: z.string().max(100).default("sde"),
});

// ─── Reports ──────────────────────────────────────────────────────────────────
export const generateReportSchema = z.object({
    sessionId: z.string().min(1, "sessionId is required"),
    code: z.string().nullish().transform(val => val ?? ""),
    problem: z.string().nullish().transform(val => val ?? ""),
    transcript: z.string().nullish().transform(val => val ?? ""),
    fillerCount: z.coerce.number().optional().default(0),
    elapsed: z.coerce.number().optional().default(0),
    hintCount: z.coerce.number().optional().default(0),
    runCount: z.coerce.number().optional().default(0),
    timeLimit: z.coerce.number().optional().default(0),
});

// ─── Problems (CRUD) ─────────────────────────────────────────────────────────
export const createProblemSchema = z.object({
    title: z.string().min(1, "title is required").max(200),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
    description: z.string().min(1, "description is required"),
    examples: z
        .array(
            z.object({
                input: z.string(),
                output: z.string(),
            })
        )
        .default([]),
    constraints: z.array(z.string()).default([]),
});
