import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted to avoid reference-before-initialization with vi.mock hoisting
const { mockCreate } = vi.hoisted(() => ({
    mockCreate: vi.fn(),
}));

vi.mock("groq-sdk", () => ({
    default: class {
        chat = { completions: { create: mockCreate } };
    },
}));

vi.mock("../config/env.js", () => ({
    env: {
        GROQ_API_KEY: "test-key",
        PORT: 5000,
        JWT_ACCESS_SECRET: "test",
        JWT_REFRESH_SECRET: "test",
        CLIENT_URL: "http://localhost:5173",
        JUDGE0_URL: "test",
        GOOGLE_CLIENT_ID: "test",
        GOOGLE_CLIENT_SECRET: "test",
        NODE_ENV: "test",
        DATABASE_URL: "test",
    },
}));

vi.mock("../utils/logger.js", () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { ReviewService } from "../services/review.service.js";

describe("ReviewService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should parse valid JSON array from LLM response", async () => {
        mockCreate.mockResolvedValueOnce({
            choices: [{
                message: {
                    content: '[{"line": 3, "severity": "warning", "message": "Missing null check"}]',
                },
            }],
        });

        const comments = await ReviewService.reviewCode("const x = 1;\nconst y = 2;\nconst z = 3;", "Two Sum", "javascript");

        expect(comments).toHaveLength(1);
        expect(comments[0]).toEqual({
            line: 3,
            severity: "warning",
            message: "Missing null check",
        });
    });

    it("should handle markdown code fences in LLM response", async () => {
        mockCreate.mockResolvedValueOnce({
            choices: [{
                message: {
                    content: '```json\n[{"line": 1, "severity": "error", "message": "Bug here"}]\n```',
                },
            }],
        });

        const comments = await ReviewService.reviewCode("x()", "Test", "python");

        expect(comments).toHaveLength(1);
        expect(comments[0]!.severity).toBe("error");
    });

    it("should return empty array for empty LLM response", async () => {
        mockCreate.mockResolvedValueOnce({
            choices: [{ message: { content: "[]" } }],
        });

        const comments = await ReviewService.reviewCode("good code", "Test", "javascript");
        expect(comments).toEqual([]);
    });

    it("should filter out invalid comments from LLM response", async () => {
        mockCreate.mockResolvedValueOnce({
            choices: [{
                message: {
                    content: JSON.stringify([
                        { line: 1, severity: "error", message: "Valid" },
                        { line: "not a number", severity: "error", message: "Invalid line" },
                        { line: 2, severity: "critical", message: "Invalid severity" },
                        { line: 3, severity: "info", message: "Valid too" },
                    ]),
                },
            }],
        });

        const comments = await ReviewService.reviewCode("code", "Test", "javascript");

        expect(comments).toHaveLength(2);
        expect(comments[0]!.message).toBe("Valid");
        expect(comments[1]!.message).toBe("Valid too");
    });

    it("should limit to 8 comments max", async () => {
        const manyComments = Array.from({ length: 15 }, (_, i) => ({
            line: i + 1,
            severity: "info",
            message: `Comment ${i + 1}`,
        }));

        mockCreate.mockResolvedValueOnce({
            choices: [{ message: { content: JSON.stringify(manyComments) } }],
        });

        const comments = await ReviewService.reviewCode("code", "Test", "javascript");
        expect(comments).toHaveLength(8);
    });

    it("should truncate long messages to 150 chars", async () => {
        const longMessage = "A".repeat(300);
        mockCreate.mockResolvedValueOnce({
            choices: [{
                message: {
                    content: JSON.stringify([{ line: 1, severity: "warning", message: longMessage }]),
                },
            }],
        });

        const comments = await ReviewService.reviewCode("code", "Test", "javascript");
        expect(comments[0]!.message).toHaveLength(150);
    });

    it("should return empty array on API error", async () => {
        mockCreate.mockRejectedValueOnce(new Error("API rate limit"));

        const comments = await ReviewService.reviewCode("code", "Test", "javascript");
        expect(comments).toEqual([]);
    });

    it("should clamp line numbers to minimum 1", async () => {
        mockCreate.mockResolvedValueOnce({
            choices: [{
                message: {
                    content: JSON.stringify([{ line: -5, severity: "error", message: "Negative line" }]),
                },
            }],
        });

        const comments = await ReviewService.reviewCode("code", "Test", "javascript");
        expect(comments[0]!.line).toBe(1);
    });

    it("should clamp line numbers to maximum document line count", async () => {
        mockCreate.mockResolvedValueOnce({
            choices: [{
                message: {
                    content: JSON.stringify([{ line: 50, severity: "warning", message: "Out of bounds line" }]),
                },
            }],
        });

        const comments = await ReviewService.reviewCode("line1\nline2\nline3", "Test", "javascript");
        expect(comments[0]!.line).toBe(3);
    });
});
