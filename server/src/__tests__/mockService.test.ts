import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Groq — must use vi.hoisted because vi.mock is hoisted above variable declarations
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
vi.mock("groq-sdk", () => {
    return {
        default: class MockGroq {
            chat = { completions: { create: mockCreate } };
        },
    };
});

// Mock Prisma
const mockRoomCreate = vi.fn();
const mockSessionCreate = vi.fn();
vi.mock("../lib/prisma.js", () => ({
    prisma: {
        room: { create: (...args: any[]) => mockRoomCreate(...args) },
        session: { create: (...args: any[]) => mockSessionCreate(...args) },
    },
}));

vi.mock("../config/env.js", () => ({
    env: { GROQ_API_KEY: "test-key" },
}));

vi.mock("../utils/logger.js", () => ({
    logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { MockService } from "../services/mock.service.js";

describe("MockService.generateQuestion", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns AI-generated question on success", async () => {
        const question = {
            title: "Reverse String",
            difficulty: "Easy",
            description: "Reverse a string in-place.",
            examples: [{ input: '"hello"', output: '"olleh"' }],
            constraints: ["1 <= s.length <= 10^5"],
        };
        mockCreate.mockResolvedValue({
            choices: [{ message: { content: JSON.stringify(question) } }],
        });

        const result = await MockService.generateQuestion("Easy", "sde");

        expect(result.title).toBe("Reverse String");
        expect(result.description).toContain("Reverse");
    });

    it("returns fallback question when AI fails", async () => {
        mockCreate.mockRejectedValue(new Error("API error"));

        const result = await MockService.generateQuestion("EASY", "sde");

        expect(result.title).toBe("Two Sum"); // fallback
    });

    it("returns fallback when AI returns incomplete JSON", async () => {
        mockCreate.mockResolvedValue({
            choices: [{ message: { content: '{"title": ""}' } }], // empty title
        });

        const result = await MockService.generateQuestion("MEDIUM", "backend");

        expect(result.title).toBe("Longest Substring Without Repeating Characters"); // MEDIUM fallback
    });

    it("returns MEDIUM fallback for unknown difficulty", async () => {
        mockCreate.mockRejectedValue(new Error("fail"));

        const result = await MockService.generateQuestion("EXTREME", "sde");

        expect(result.title).toBe("Longest Substring Without Repeating Characters");
    });

    it("handles unknown roles gracefully", async () => {
        const question = { title: "Test", difficulty: "Easy", description: "Test desc", examples: [], constraints: [] };
        mockCreate.mockResolvedValue({
            choices: [{ message: { content: JSON.stringify(question) } }],
        });

        const result = await MockService.generateQuestion("Easy", "devops");

        expect(result.title).toBe("Test");
    });
});

describe("MockService.startSession", () => {
    beforeEach(() => vi.clearAllMocks());

    it("creates room with MOCK mode and session", async () => {
        mockRoomCreate.mockResolvedValue({ id: "room-1" });
        mockSessionCreate.mockResolvedValue({ id: "sess-1" });

        const result = await MockService.startSession("user-1");

        expect(result).toEqual({ roomId: "room-1", sessionId: "sess-1" });
        expect(mockRoomCreate).toHaveBeenCalledWith(
            expect.objectContaining({ data: { userId: "user-1", mode: "MOCK" } })
        );
        expect(mockSessionCreate).toHaveBeenCalledWith(
            expect.objectContaining({ data: { roomId: "room-1", userId: "user-1" } })
        );
    });
});
