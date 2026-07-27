import { useState, useEffect, useRef } from "react";

interface PanelOptions {
    initialProblemWidth?: number;
    initialRightWidth?: number;
    initialConsoleHeight?: number;
}

export const useResizablePanels = (options: PanelOptions = {}) => {
    const { initialProblemWidth = 384, initialRightWidth = 300, initialConsoleHeight = 128 } = options;

    const [problemWidth, setProblemWidth] = useState(initialProblemWidth);
    const [rightWidth, setRightWidth] = useState(initialRightWidth);
    const [consoleHeight, setConsoleHeight] = useState(initialConsoleHeight);

    const activeResizeRef = useRef<"problem" | "right" | "console" | null>(null);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!activeResizeRef.current) return;
            if (activeResizeRef.current === "problem") {
                const w = Math.max(200, Math.min(600, e.clientX));
                setProblemWidth(w);
            } else if (activeResizeRef.current === "right") {
                const w = Math.max(200, Math.min(500, window.innerWidth - e.clientX));
                setRightWidth(w);
            } else if (activeResizeRef.current === "console") {
                const editorPanel = document.getElementById("editor-center-panel") || document.getElementById("mock-editor-panel");
                if (!editorPanel) return;
                const rect = editorPanel.getBoundingClientRect();
                const h = Math.max(60, Math.min(450, rect.bottom - e.clientY));
                setConsoleHeight(h);
            }
        };

        const onUp = () => {
            activeResizeRef.current = null;
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, []);

    const startResize = (panel: "problem" | "right" | "console") => (e: React.MouseEvent) => {
        e.preventDefault();
        activeResizeRef.current = panel;
    };

    return {
        problemWidth,
        rightWidth,
        consoleHeight,
        startResize,
    };
};
