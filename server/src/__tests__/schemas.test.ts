import { describe, it, expect } from "vitest";
import {
    createRoomSchema,
    joinRoomSchema,
    createProblemSchema,
    mockQuestionSchema,
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
});
