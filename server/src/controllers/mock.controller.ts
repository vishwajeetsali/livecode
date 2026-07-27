import type { Request, Response } from "express";
import Groq from "groq-sdk";
import { prisma } from "../lib/prisma.js";
import type { JwtUser } from "../types/index.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface ParsedQuestion {
    title?: string;
    difficulty?: string;
    description?: string;
    examples?: { input: string; output: string }[];
    constraints?: string[];
}

const FALLBACK_QUESTIONS: Record<string, ParsedQuestion> = {
    EASY: {
        title: "Two Sum",
        difficulty: "EASY",
        description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        examples: [{ input: "nums = [2,7,11,15], target = 9", output: "[0,1]" }],
        constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"]
    },
    MEDIUM: {
        title: "Longest Substring Without Repeating Characters",
        difficulty: "MEDIUM",
        description: "Given a string s, find the length of the longest substring without repeating characters.",
        examples: [{ input: "s = \"abcabcbb\"", output: "3" }],
        constraints: ["0 <= s.length <= 5 * 10^4"]
    },
    HARD: {
        title: "Trapping Rain Water",
        difficulty: "HARD",
        description: "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
        examples: [{ input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6" }],
        constraints: ["n == height.length", "1 <= n <= 2 * 10^4"]
    }
};

export const generateQuestion = async (req: Request, res: Response) => {
    const { difficulty = "medium", role = "sde" } = req.body;

    const roleDescriptions: Record<string, string> = {
        sde: "Software Development Engineer — focus on algorithms and data structures (arrays, strings, trees, graphs, dynamic programming, two pointers, sliding window)",
        backend: "Backend & Systems Engineer — focus on systems-oriented problems (LRU cache, rate limiting, queue/stack simulation, data pipeline processing, API response parsing)",
        data: "Data & Analytics Engineer — focus on data manipulation problems (frequency maps, aggregation, matrix operations, sorting/grouping, log parsing, statistical calculations)",
    };

    // Use known description or pass custom role string directly
    const rolePrompt = roleDescriptions[role.toLowerCase().trim()] ?? `${role} engineer — generate a coding problem relevant to this domain`;

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You are a technical interview question generator. Return ONLY a JSON object:
{
  "title": <problem title>,
  "difficulty": <"Easy" | "Medium" | "Hard">,
  "description": <full problem description with examples>,
  "examples": [{ "input": <string>, "output": <string> }],
  "constraints": [<constraint strings>]
}
No markdown, no explanation, only JSON.`
                },
                {
                    role: "user",
                    content: `Generate a ${difficulty} difficulty coding interview question for a ${rolePrompt}. The problem should be practical and directly relevant to this engineering role.`
                }
            ],
        });

        const raw = completion.choices[0]?.message?.content || "{}";
        const question: ParsedQuestion = JSON.parse(raw);
        if (!question.title || !question.description) {
            throw new Error("Incomplete question object from AI");
        }
        res.json(question);
    } catch (error) {
        console.warn("Question generation failed, returning fallback:", error);
        const fallback = FALLBACK_QUESTIONS[String(difficulty).toUpperCase()] || FALLBACK_QUESTIONS.MEDIUM;
        res.json(fallback);
    }
};

export const startMockSession = async (req: Request, res: Response) => {
    try {
        const user = req.user as JwtUser;
        // create a mock room + session
        const room = await prisma.room.create({
            data: { userId: user.userId, mode: "MOCK" },
        });

        const session = await prisma.session.create({
            data: { roomId: room.id, userId: user.userId },
        });

        res.json({ roomId: room.id, sessionId: session.id });
    } catch (error) {
        res.status(500).json({ message: "server error" });
    }
};