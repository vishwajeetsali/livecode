import TestResultsPanel, { type TestResultItem } from "./TestResultsPanel";

interface ConsolePanelProps {
    height: number;
    consoleTab: "output" | "stdin";
    setConsoleTab: (tab: "output" | "stdin") => void;
    output: string;
    testResults: TestResultItem[] | null;
    stdin: string;
    setStdin: (v: string) => void;
}

const ConsolePanel = ({ height, consoleTab, setConsoleTab, output, testResults, stdin, setStdin }: ConsolePanelProps) => {
    return (
    <div
        style={{ height: `${height}px` }}
        className="border-t border-white/[0.06] bg-[var(--bg-surface)] px-4 py-2.5 shrink-0 overflow-y-auto flex flex-col"
    >
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3" role="tablist" aria-label="Console tabs">
                <button
                    onClick={() => setConsoleTab("output")}
                    role="tab"
                    aria-selected={consoleTab === "output"}
                    aria-controls="console-output"
                    className={`text-[10px] uppercase tracking-[0.15em] font-semibold transition ${consoleTab === "output" ? "text-[var(--accent)] border-b border-[var(--accent)] pb-0.5" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}
                >Output</button>
                <button
                    onClick={() => setConsoleTab("stdin")}
                    role="tab"
                    aria-selected={consoleTab === "stdin"}
                    aria-controls="console-stdin"
                    className={`text-[10px] uppercase tracking-[0.15em] font-semibold transition ${consoleTab === "stdin" ? "text-[var(--accent)] border-b border-[var(--accent)] pb-0.5" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}
                >Input (STDIN)</button>
            </div>
            <span className="text-[9px] text-[var(--text-muted)] font-mono">Ctrl+Enter to Run</span>
        </div>
        {consoleTab === "output" ? (
            <div id="console-output" role="tabpanel" aria-label="Code output" aria-live="polite">
                <TestResultsPanel testResults={testResults} rawOutput={output} />
            </div>
        ) : (
            <textarea
                id="console-stdin"
                role="tabpanel"
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Enter program STDIN input here..."
                aria-label="Standard input for code execution"
                className="w-full flex-1 bg-black/20 border border-white/[0.06] rounded-lg p-2 text-xs text-[var(--text-secondary)] font-mono outline-none focus:border-[var(--accent)]/40 resize-none"
            />
        )}
    </div>
    );
};

export default ConsolePanel;
