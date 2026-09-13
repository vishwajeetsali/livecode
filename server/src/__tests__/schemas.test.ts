import { describe, it, expect } from "vitest";
import {
    createRoomSchema,
    joinRoomSchema,
    createProblemSchema,
    mockQuestionSchema,
    reviewCodeSchema,
    mockStartSchema,
    generateReportSchema,
} from "../middleware/schemas.js";

describe("Zod Validation Schemas", () => {
    describe("createRoomSchema", () => {
        it("should accept valid mode LIVE", () => {
            const result = createRoomSchema.safeParse({ mode: "LIVE" });
            expect(result.success).toBe(true);
        });

        it("should reject invalid mode string", () => {
            const result = createRoomSchema.safeParse({ mode: "INVALID_MODE" });
            expect(result.success).toBe(false);
        });
    });

    describe("joinRoomSchema", () => {
        it("should accept non-empty roomId", () => {
            const result = joinRoomSchema.safeParse({ roomId: "room-12345" });
            expect(result.success).toBe(true);
        });

        it("should reject empty roomId", () => {
            const result = joinRoomSchema.safeParse({ roomId: "" });
            expect(result.success).toBe(false);
        });
    });

    describe("createProblemSchema", () => {
        it("should accept valid problem object", () => {
            const payload = {
                title: "Two Sum Test",
                difficulty: "EASY",
                description: "Test description",
                examples: [{ input: "a = 1", output: "1" }],
                constraints: ["1 <= a <= 10"],
            };
            const result = createProblemSchema.safeParse(payload);
            expect(result.success).toBe(true);
        });

        it("should reject missing title or description", () => {
            const payload = {
                difficulty: "EASY",
            };
            const result = createProblemSchema.safeParse(payload);
            expect(result.success).toBe(false);
        });

        it("should reject whitespace-only title or description", () => {
            const payload = {
                title: "   ",
                description: "   ",
                difficulty: "EASY",
            };
            const result = createProblemSchema.safeParse(payload);
            expect(result.success).toBe(false);
        });

        it("should trim leading and trailing spaces from title", () => {
            const payload = {
                title: "  Valid Title  ",
                description: "  Valid Description  ",
                difficulty: "EASY",
            };
            const result = createProblemSchema.safeParse(payload);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.title).toBe("Valid Title");
                expect(result.data.description).toBe("Valid Description");
            }
        });
    });

    describe("mockQuestionSchema", () => {
        it("should parse difficulty and role correctly", () => {
            const result = mockQuestionSchema.safeParse({
                difficulty: "HARD",
                role: "backend",
            });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.difficulty).toBe("HARD");
            }
        });
    });

    describe("reviewCodeSchema", () => {
        it("should accept valid code review payload", () => {
            const result = reviewCodeSchema.safeParse({
                code: "function add(a, b) { return a + b; }",
                problem: "Add Two Numbers",
                language: "javascript",
            });
            expect(result.success).toBe(true);
        });

        it("should reject empty code", () => {
            const result = reviewCodeSchema.safeParse({
                code: "",
            });
            expect(result.success).toBe(false);
        });

        it("should reject code exceeding size limit", () => {
            const result = reviewCodeSchema.safeParse({
                code: "x".repeat(60000),
            });
            expect(result.success).toBe(false);
        });
    });

    describe("mockStartSchema", () => {
        it("should accept empty or missing body", () => {
            const result = mockStartSchema.safeParse({});
            expect(result.success).toBe(true);
        });

        it("should accept optional setup config", () => {
            const result = mockStartSchema.safeParse({
                role: "sde",
                difficulty: "MEDIUM",
            });
            expect(result.success).toBe(true);
        });
    });

    describe("generateReportSchema", () => {
        it("should accept valid report generation payload", () => {
            const result = generateReportSchema.safeParse({
                sessionId: "session-123",
                code: "const x = 1;",
                problem: "Two Sum",
            });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.sessionId).toBe("session-123");
            }
        });

        it("should reject missing sessionId", () => {
            const result = generateReportSchema.safeParse({
                code: "const x = 1;",
            });
            expect(result.success).toBe(false);
        });
    });
});
