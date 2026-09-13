// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useResizablePanels } from "../hooks/useResizablePanels";

describe("useResizablePanels", () => {
    it("returns default initial sizes", () => {
        const { result } = renderHook(() => useResizablePanels());

        expect(result.current.problemWidth).toBe(384);
        expect(result.current.rightWidth).toBe(300);
        expect(result.current.consoleHeight).toBe(128);
    });

    it("accepts custom initial sizes", () => {
        const { result } = renderHook(() =>
            useResizablePanels({ initialProblemWidth: 400, initialRightWidth: 350, initialConsoleHeight: 200 })
        );

        expect(result.current.problemWidth).toBe(400);
        expect(result.current.rightWidth).toBe(350);
        expect(result.current.consoleHeight).toBe(200);
    });

    it("provides startResize function for each panel", () => {
        const { result } = renderHook(() => useResizablePanels());

        expect(typeof result.current.startResize("problem")).toBe("function");
        expect(typeof result.current.startResize("right")).toBe("function");
        expect(typeof result.current.startResize("console")).toBe("function");
    });

    it("clamps problem panel width within bounds on mouse move", () => {
        const { result } = renderHook(() => useResizablePanels());

        // Start problem resize
        act(() => {
            const handler = result.current.startResize("problem");
            handler({ preventDefault: () => {} } as React.MouseEvent);
        });

        // Move mouse to x=100 (below min 200)
        act(() => {
            window.dispatchEvent(new MouseEvent("mousemove", { clientX: 100 }));
        });
        expect(result.current.problemWidth).toBe(200); // clamped to min

        // Move mouse to x=800 (above max 600)
        act(() => {
            window.dispatchEvent(new MouseEvent("mousemove", { clientX: 800 }));
        });
        expect(result.current.problemWidth).toBe(600); // clamped to max
    });

    it("stops resizing on mouseup", () => {
        const { result } = renderHook(() => useResizablePanels());

        act(() => {
            const handler = result.current.startResize("problem");
            handler({ preventDefault: () => {} } as React.MouseEvent);
        });

        act(() => {
            window.dispatchEvent(new MouseEvent("mousemove", { clientX: 450 }));
        });
        expect(result.current.problemWidth).toBe(450);

        // Release mouse
        act(() => {
            window.dispatchEvent(new MouseEvent("mouseup"));
        });

        // Further movement should not change width
        act(() => {
            window.dispatchEvent(new MouseEvent("mousemove", { clientX: 300 }));
        });
        expect(result.current.problemWidth).toBe(450); // unchanged
    });
});
