// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock the api module
const mockPost = vi.fn();
vi.mock("../utils/api", () => ({
    default: { post: (...args: unknown[]) => mockPost(...args) },
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
    default: { error: vi.fn(), success: vi.fn() },
}));

import { useCodeExecution } from "../hooks/useCodeExecution";

describe("useCodeExecution", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("starts with default state", () => {
        const { result } = renderHook(() => useCodeExecution());

        expect(result.current.output).toBe("");
        expect(result.current.testResults).toBeNull();
        expect(result.current.loadingRun).toBe(false);
        expect(result.current.runCount).toBe(0);
    });

    it("executes code and updates output", async () => {
        mockPost.mockResolvedValue({
            data: { output: "Hello World" },
        });

        const { result } = renderHook(() => useCodeExecution());

        await act(async () => {
            await result.current.executeCode("console.log('test')", 63, "", "Test", []);
        });

        expect(result.current.output).toBe("Hello World");
        expect(result.current.runCount).toBe(1);
        expect(result.current.loadingRun).toBe(false);
    });

    it("defaults to 'No output' when output is empty", async () => {
        mockPost.mockResolvedValue({
            data: { output: "" },
        });

        const { result } = renderHook(() => useCodeExecution());

        await act(async () => {
            await result.current.executeCode("x = 1", 71, "", "Test", []);
        });

        expect(result.current.output).toBe("No output");
    });

    it("handles API errors gracefully", async () => {
        mockPost.mockRejectedValue(new Error("Network error"));

        const { result } = renderHook(() => useCodeExecution());

        await act(async () => {
            await result.current.executeCode("code", 63, "", "Test", []);
        });

        expect(result.current.loadingRun).toBe(false);
        expect(result.current.runCount).toBe(1);
    });

    it("sets test results when returned", async () => {
        mockPost.mockResolvedValue({
            data: {
                output: "pass",
                testResults: [
                    { input: "1", expected: "1", actual: "1", passed: true },
                ],
            },
        });

        const { result } = renderHook(() => useCodeExecution());

        await act(async () => {
            await result.current.executeCode("code", 63, "", "Test", [{ input: "1", output: "1" }]);
        });

        expect(result.current.testResults).toHaveLength(1);
        expect(result.current.testResults![0].passed).toBe(true);
    });

    it("increments runCount on each execution", async () => {
        mockPost.mockResolvedValue({ data: { output: "ok" } });

        const { result } = renderHook(() => useCodeExecution());

        await act(async () => {
            await result.current.executeCode("a", 63, "", "T", []);
        });
        await act(async () => {
            await result.current.executeCode("b", 63, "", "T", []);
        });

        expect(result.current.runCount).toBe(2);
    });
});
