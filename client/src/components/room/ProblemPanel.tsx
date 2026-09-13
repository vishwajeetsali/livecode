import type { Problem } from "../../types";

interface ProblemPanelProps {
    problem: Problem;
    width: number;
}

const ProblemPanel = ({ problem, width }: ProblemPanelProps) => (
    <div
        style={{ width: `${width}px` }}
        className="border-r border-white/[0.06] overflow-y-auto p-5 flex flex-col gap-4 bg-[var(--bg-surface)] shrink-0"
    >
        <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-white">{problem.title}</h2>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                problem.difficulty === "EASY" ? "text-green-400 border-green-400/20 bg-green-400/5"
                : problem.difficulty === "MEDIUM" ? "text-yellow-400 border-yellow-400/20 bg-yellow-400/5"
                : "text-red-400 border-red-400/20 bg-red-400/5"
            }`}>
                {problem.difficulty}
            </span>
        </div>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-wrap">{problem.description}</p>

        {problem.examples && Array.isArray(problem.examples) && problem.examples.map((ex: { input: string; output: string }, i: number) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
                <p className="text-[10px] text-[var(--text-muted)] mb-2 font-semibold uppercase tracking-wider">Example {i + 1}</p>
                <p className="text-xs font-mono text-[var(--text-secondary)]">Input: {ex.input}</p>
                <p className="text-xs font-mono text-[var(--text-secondary)] mt-1">Output: {ex.output}</p>
            </div>
        ))}

        {problem.constraints && problem.constraints.length > 0 && (
            <div className="mt-1">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] mb-2 font-semibold">Constraints</p>
                <ul className="list-disc pl-4 space-y-1">
                    {problem.constraints.map((c: string, i: number) => (
                        <li key={i} className="text-xs text-[var(--text-muted)] font-mono">{c}</li>
                    ))}
                </ul>
            </div>
        )}
    </div>
);

export default ProblemPanel;
