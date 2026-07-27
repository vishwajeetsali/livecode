import { describe, it, expect } from "vitest";
import { formatTime, safeStr, langMap } from "../utils/helper";

describe("Frontend Helper Utilities", () => {
    describe("formatTime", () => {
        it("should format 0 seconds as 00:00", () => {
            expect(formatTime(0)).toBe("00:00");
        });

        it("should format 65 seconds as 01:05", () => {
            expect(formatTime(65)).toBe("01:05");
        });

        it("should format 3600 seconds (1 hr) as 60:00", () => {
            expect(formatTime(3600)).toBe("60:00");
        });
    });

    describe("safeStr", () => {
        it("should return empty string for null or undefined", () => {
            expect(safeStr(null)).toBe("");
            expect(safeStr(undefined)).toBe("");
        });

        it("should return string representation for values", () => {
            expect(safeStr("hello")).toBe("hello");
            expect(safeStr(123)).toBe("123");
        });
    });

    describe("langMap", () => {
        it("should map javascript to Judge0 ID 63", () => {
            expect(langMap.javascript).toBe(63);
        });

        it("should map python to Judge0 ID 71", () => {
            expect(langMap.python).toBe(71);
        });

        it("should map cpp to Judge0 ID 54", () => {
            expect(langMap.cpp).toBe(54);
        });
    });
});
