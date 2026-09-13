// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReplayPlayer } from "../hooks/useReplayPlayer";
import type { ReplayEvent } from "../hooks/useReplayPlayer";

const sampleEvents: ReplayEvent[] = [
    { type: "code", timestamp: 0, data: { code: "// start" } },
    { type: "language", timestamp: 500, data: { language: "python" } },
    { type: "code", timestamp: 1000, data: { code: "def solve():" } },
    { type: "cursor", timestamp: 1500, data: { lineNumber: 2, column: 5 } },
    { type: "code", timestamp: 2000, data: { code: "def solve():\n  return 42" } },
];

describe("useReplayPlayer", () => {
    it("should initialize with correct defaults", () => {
        const { result } = renderHook(() => useReplayPlayer(sampleEvents));

        expect(result.current.currentTime).toBe(0);
        expect(result.current.isPlaying).toBe(false);
        expect(result.current.speed).toBe(1);
        expect(result.current.progress).toBe(0);
        expect(result.current.duration).toBe(2000);
    });

    it("should compute initial state from first event", () => {
        const { result } = renderHook(() => useReplayPlayer(sampleEvents));

        expect(result.current.state.code).toBe("// start");
        expect(result.current.state.language).toBe("javascript"); // default before any language event
    });

    it("should compute state at time 0", () => {
        const { result } = renderHook(() => useReplayPlayer(sampleEvents));

        act(() => result.current.seekTo(0));

        expect(result.current.state.code).toBe("// start");
        expect(result.current.state.language).toBe("javascript");
    });

    it("should compute state at time 500 (after language change)", () => {
        const { result } = renderHook(() => useReplayPlayer(sampleEvents));

        act(() => result.current.seekTo(500));

        expect(result.current.state.language).toBe("python");
        expect(result.current.state.code).toBe("// start");
    });

    it("should compute state at time 1000 (after code change)", () => {
        const { result } = renderHook(() => useReplayPlayer(sampleEvents));

        act(() => result.current.seekTo(1000));

        expect(result.current.state.code).toBe("def solve():");
        expect(result.current.state.language).toBe("python");
    });

    it("should compute state at time 1500 (after cursor move)", () => {
        const { result } = renderHook(() => useReplayPlayer(sampleEvents));

        act(() => result.current.seekTo(1500));

        expect(result.current.state.cursorPosition).toEqual({ lineNumber: 2, column: 5 });
    });

    it("should compute final state at duration", () => {
        const { result } = renderHook(() => useReplayPlayer(sampleEvents));

        act(() => result.current.seekTo(2000));

        expect(result.current.state.code).toBe("def solve():\n  return 42");
        expect(result.current.state.language).toBe("python");
    });

    it("should clamp seekTo within valid range", () => {
        const { result } = renderHook(() => useReplayPlayer(sampleEvents));

        act(() => result.current.seekTo(-100));
        expect(result.current.currentTime).toBe(0);

        act(() => result.current.seekTo(99999));
        expect(result.current.currentTime).toBe(2000);
    });

    it("should update progress on seekToProgress", () => {
        const { result } = renderHook(() => useReplayPlayer(sampleEvents));

        act(() => result.current.seekToProgress(0.5));

        expect(result.current.currentTime).toBe(1000);
        expect(result.current.progress).toBeCloseTo(0.5, 2);
    });

    it("should change speed", () => {
        const { result } = renderHook(() => useReplayPlayer(sampleEvents));

        act(() => result.current.setSpeed(4));
        expect(result.current.speed).toBe(4);
    });

    it("should toggle play/pause", () => {
        const { result } = renderHook(() => useReplayPlayer(sampleEvents));

        expect(result.current.isPlaying).toBe(false);

        act(() => result.current.toggle());
        expect(result.current.isPlaying).toBe(true);

        act(() => result.current.toggle());
        expect(result.current.isPlaying).toBe(false);
    });

    it("should handle empty events gracefully", () => {
        const { result } = renderHook(() => useReplayPlayer([]));

        expect(result.current.duration).toBe(0);
        expect(result.current.progress).toBe(0);
        expect(result.current.state.code).toBe("// Start coding here...");
        expect(result.current.state.language).toBe("javascript");
    });

    it("should reset to 0 when playing from end", () => {
        const { result } = renderHook(() => useReplayPlayer(sampleEvents));

        act(() => result.current.seekTo(2000));
        expect(result.current.currentTime).toBe(2000);

        act(() => result.current.play());
        // Should have reset to 0 and started playing
        expect(result.current.currentTime).toBe(0);
        expect(result.current.isPlaying).toBe(true);

        // Clean up
        act(() => result.current.pause());
    });
});
