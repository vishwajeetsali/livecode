import { useState, useEffect, useCallback } from "react";
import type { Problem } from "../../types";
import api from "../../utils/api";
import toast from "react-hot-toast";

const difficultyStyle: Record<string, string> = {
    EASY: "border-green-400/30 text-green-400 bg-green-400/5",
    MEDIUM: "border-yellow-400/30 text-yellow-400 bg-yellow-400/5",
    HARD: "border-red-400/30 text-red-400 bg-red-400/5",
};

interface ProblemBankProps {
    problems: Problem[];
    loading: boolean;
    onRefresh: () => void;
}

const ProblemBank = ({ problems, loading, onRefresh }: ProblemBankProps) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDifficulty, setNewDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("EASY");
    const [newDescription, setNewDescription] = useState("");
    const [newExampleInput, setNewExampleInput] = useState("");
    const [newExampleOutput, setNewExampleOutput] = useState("");
    const [constraintInput, setConstraintInput] = useState("");
    const [constraintsList, setConstraintsList] = useState<string[]>([]);
    const [deleteTarget, setDeleteTarget] = useState<Problem | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleAddConstraint = (e: React.FormEvent) => {
        e.preventDefault();
        if (!constraintInput.trim()) return;
        setConstraintsList((prev) => [...prev, constraintInput.trim()]);
        setConstraintInput("");
    };

    const handleSaveProblem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !newDescription.trim()) {
            toast.error("Please fill in the title and description.");
            return;
        }

        const examples = newExampleInput.trim() || newExampleOutput.trim()
            ? [{ input: newExampleInput, output: newExampleOutput }]
            : [];

        try {
            await api.post("/problems/create", {
                title: newTitle,
                difficulty: newDifficulty,
                description: newDescription,
                examples,
                constraints: constraintsList
            });
            toast.success("Problem added to bank!");

            setNewTitle("");
            setNewDifficulty("EASY");
            setNewDescription("");
            setNewExampleInput("");
            setNewExampleOutput("");
            setConstraintsList([]);
            setShowAddForm(false);

            onRefresh();
        } catch (err) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || "Failed to create problem.");
        }
    };

    const handleDeleteProblem = async () => {
        if (!deleteTarget) return;
        try {
            setDeleting(true);
            await api.delete(`/problems/${deleteTarget.id}`);
            toast.success("Problem deleted.");
            setDeleteTarget(null);
            onRefresh();
        } catch {
            toast.error("Failed to delete problem.");
        } finally {
            setDeleting(false);
        }
    };

    // Close modal on Escape key
    const handleEscape = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape") setDeleteTarget(null);
    }, []);

    useEffect(() => {
        if (deleteTarget) {
            document.addEventListener("keydown", handleEscape);
            return () => document.removeEventListener("keydown", handleEscape);
        }
    }, [deleteTarget, handleEscape]);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Custom Problem Bank</h2>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={`text-xs px-4 py-2 rounded-xl border transition font-semibold ${
                        showAddForm ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-[var(--accent)] text-black border-transparent"
                    }`}
                >
                    {showAddForm ? "Cancel" : "＋ Add Problem"}
                </button>
            </div>

            {/* Add Problem Form */}
            {showAddForm && (
                <form onSubmit={handleSaveProblem} className="glass-card p-6 mb-8 flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] block mb-1.5 font-medium">Title</label>
                            <input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="e.g. Two Sum"
                                className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]/50 transition text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] block mb-1.5 font-medium">Difficulty</label>
                            <select
                                value={newDifficulty}
                                onChange={(e) => setNewDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD")}
                                className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]/50 transition text-sm"
                            >
                                <option value="EASY">Easy</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HARD">Hard</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] block mb-1.5 font-medium">Description</label>
                        <textarea
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            placeholder="Describe the problem, input/output requirements..."
                            rows={4}
                            className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]/50 transition text-sm leading-relaxed"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] block mb-1.5 font-medium">Example Input</label>
                            <input
                                value={newExampleInput}
                                onChange={(e) => setNewExampleInput(e.target.value)}
                                placeholder="e.g. nums = [2,7,11], target = 9"
                                className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]/50 transition text-sm font-mono"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] block mb-1.5 font-medium">Example Output</label>
                            <input
                                value={newExampleOutput}
                                onChange={(e) => setNewExampleOutput(e.target.value)}
                                placeholder="e.g. [0, 1]"
                                className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]/50 transition text-sm font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] block mb-1.5 font-medium">Constraints</label>
                        <div className="flex gap-2">
                            <input
                                value={constraintInput}
                                onChange={(e) => setConstraintInput(e.target.value)}
                                placeholder="e.g. 1 <= nums.length <= 10^4"
                                className="flex-1 bg-black/30 border border-white/[0.08] rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]/50 transition text-sm font-mono"
                            />
                            <button
                                type="button"
                                onClick={handleAddConstraint}
                                className="bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-[var(--text-secondary)] font-semibold px-4 py-2.5 rounded-xl text-sm transition"
                            >
                                Add
                            </button>
                        </div>
                        {constraintsList.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {constraintsList.map((c, i) => (
                                    <span key={i} className="text-[10px] font-mono bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-lg text-[var(--text-muted)] flex items-center gap-1.5">
                                        {c}
                                        <button
                                            type="button"
                                            onClick={() => setConstraintsList(prev => prev.filter((_, idx) => idx !== i))}
                                            className="text-red-400 hover:text-red-300 text-[10px]"
                                        >
                                            ✕
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="bg-[var(--accent)] text-black font-bold py-3 rounded-xl hover:bg-[var(--accent-hover)] transition text-sm mt-1"
                    >
                        💾 Save Problem
                    </button>
                </form>
            )}

            {/* Problems List */}
            {loading ? (
                <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="glass-card px-6 py-5 flex flex-col gap-2">
                            <div className="flex gap-3 items-center">
                                <div className="h-4 skeleton w-1/4" />
                                <div className="h-4 skeleton w-12" />
                            </div>
                            <div className="h-3 skeleton w-3/4 mt-1" />
                        </div>
                    ))}
                </div>
            ) : problems.length === 0 ? (
                <div className="border border-dashed border-white/[0.08] rounded-2xl p-16 text-center">
                    <p className="text-[var(--text-secondary)] font-medium text-sm">No custom problems in bank</p>
                    <p className="text-[var(--text-muted)] text-xs mt-1">Add problems to use them in interviews</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {problems.map((prob) => (
                        <div key={prob.id} className="glass-card px-6 py-4 flex items-center justify-between group">
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <p className="font-semibold text-sm">{prob.title}</p>
                                    <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${difficultyStyle[prob.difficulty]}`}>{prob.difficulty}</span>
                                </div>
                                <p className="text-[var(--text-muted)] text-xs mt-1 line-clamp-1 max-w-xl">{prob.description}</p>
                            </div>
                            <button
                                onClick={() => setDeleteTarget(prob)}
                                className="text-[10px] bg-red-500/10 border border-red-500/15 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-xl transition font-medium opacity-0 group-hover:opacity-100"
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => !deleting && setDeleteTarget(null)}
                    />
                    {/* Modal */}
                    <div className="relative bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-black/50 animate-page-fade">
                        {/* Danger icon */}
                        <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <h3 id="delete-modal-title" className="text-base font-bold text-center mb-1">Delete Problem</h3>
                        <p className="text-[var(--text-muted)] text-xs text-center mb-1.5">This action cannot be undone.</p>
                        <p className="text-[var(--text-secondary)] text-sm text-center mb-6">
                            Are you sure you want to delete <span className="font-semibold text-white">"{deleteTarget.title}"</span>?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                                className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-[var(--text-secondary)] text-xs font-semibold hover:bg-white/[0.04] transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteProblem}
                                disabled={deleting}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {deleting ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        Deleting…
                                    </>
                                ) : (
                                    "Delete"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProblemBank;
