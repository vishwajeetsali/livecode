import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { formatTime, safeStr, langMap, getSupportedMimeType, LANGUAGES } from "../utils/helper";

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

        it("should JSON.stringify objects", () => {
            expect(safeStr({ a: 1 })).toBe('{"a":1}');
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

    describe("LANGUAGES", () => {
        it("should contain 10 languages", () => {
            expect(LANGUAGES).toHaveLength(10);
        });

        it("each language has value, label, and id", () => {
            for (const lang of LANGUAGES) {
                expect(lang).toHaveProperty("value");
                expect(lang).toHaveProperty("label");
                expect(lang).toHaveProperty("id");
                expect(typeof lang.value).toBe("string");
                expect(typeof lang.id).toBe("number");
            }
        });
    });

    describe("getSupportedMimeType", () => {
        const originalMediaRecorder = globalThis.MediaRecorder;

        beforeAll(() => {
            // jsdom doesn't have MediaRecorder, so we stub it
            (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = { isTypeSupported: vi.fn(() => false) };
        });

        afterAll(() => {
            if (originalMediaRecorder) {
                globalThis.MediaRecorder = originalMediaRecorder;
            } else {
                delete (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder;
            }
        });
        it("returns first supported mime type", () => {
            // jsdom's MediaRecorder mock
            const originalIsTypeSupported = MediaRecorder.isTypeSupported;
            MediaRecorder.isTypeSupported = vi.fn((type: string) => type === "audio/webm");

            expect(getSupportedMimeType()).toBe("audio/webm");

            MediaRecorder.isTypeSupported = originalIsTypeSupported;
        });

        it("returns empty string when no type supported", () => {
            const originalIsTypeSupported = MediaRecorder.isTypeSupported;
            MediaRecorder.isTypeSupported = vi.fn(() => false);

            expect(getSupportedMimeType()).toBe("");

            MediaRecorder.isTypeSupported = originalIsTypeSupported;
        });

        it("prefers audio/webm over other types", () => {
            const originalIsTypeSupported = MediaRecorder.isTypeSupported;
            MediaRecorder.isTypeSupported = vi.fn((type: string) => type === "audio/webm" || type === "audio/mp4");

            expect(getSupportedMimeType()).toBe("audio/webm");

            MediaRecorder.isTypeSupported = originalIsTypeSupported;
        });
    });
});
