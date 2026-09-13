// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimer } from "../hooks/useTimer";

describe("useTimer", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("starts at 0 elapsed", () => {
        const { result } = renderHook(() => useTimer(false));
        expect(result.current.elapsed).toBe(0);
    });

    it("does not tick when inactive", () => {
        const { result } = renderHook(() => useTimer(false));

        act(() => {
            vi.advanceTimersByTime(3000);
        });

        expect(result.current.elapsed).toBe(0);
    });

    it("ticks every second when active", () => {
        const { result } = renderHook(() => useTimer(true));

        act(() => {
            vi.advanceTimersByTime(3000);
        });

        expect(result.current.elapsed).toBe(3);
    });

    it("stops ticking when deactivated", () => {
        const { result, rerender } = renderHook(
            ({ active }: { active: boolean }) => useTimer(active),
            { initialProps: { active: true } }
        );

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(result.current.elapsed).toBe(2);

        rerender({ active: false });

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(result.current.elapsed).toBe(2); // Stopped at 2
    });

    it("allows manual elapsed override via setElapsed", () => {
        const { result } = renderHook(() => useTimer(false));

        act(() => {
            result.current.setElapsed(100);
        });

        expect(result.current.elapsed).toBe(100);
    });
});
