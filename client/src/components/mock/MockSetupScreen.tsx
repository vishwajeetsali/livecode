import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Navbar";

const ROLE_CARDS = [
    { key: "sde", icon: "💻", label: "SDE / Full-Stack", desc: "Arrays, strings, trees, graphs, dynamic programming" },
    { key: "backend", icon: "🔧", label: "Backend & Systems", desc: "Caching, queues, rate limiting, data pipelines" },
    { key: "data", icon: "📊", label: "Data & Analytics", desc: "Frequency maps, aggregation, matrix ops, parsing" },
    { key: "custom", icon: "✏️", label: "Custom Domain", desc: "Type any role or domain below" },
];

const INTENSITIES = [
    { key: "EASY" as const, label: "Practice", color: "text-green-400 border-green-400 bg-green-400/10" },
    { key: "MEDIUM" as const, label: "Real Interview", color: "text-blue-400 border-blue-400 bg-blue-400/10" },
];

interface MockSetupScreenProps {
    onStart: (config: { difficulty: "EASY" | "MEDIUM" | "HARD"; role: string }) => void;
}

const MockSetupScreen = ({ onStart }: MockSetupScreenProps) => {
    const navigate = useNavigate();
    const [role, setRole] = useState("sde");
    const [customRole, setCustomRole] = useState("");
    const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");

    const handleStart = () => {
        const resolvedRole = role === "custom" ? (customRole.trim() || "sde") : role;
        onStart({ difficulty, role: resolvedRole });
    };

    return (
        <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col animate-page-fade">
            <Navbar />
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-16 overflow-y-auto">
                <div className="w-full max-w-2xl my-auto">

                {/* Header */}
                <div className="text-center mb-10">
                    <p className="text-[var(--accent)] text-xs font-semibold tracking-[0.2em] uppercase mb-3">AI Mock Interview</p>
                    <h1 className="text-3xl font-black tracking-tight">Set up your session</h1>
                    <p className="text-[var(--text-muted)] text-sm mt-2">Pick your role, intensity, and target duration. We'll generate a tailored problem.</p>
                </div>

                {/* Role Cards */}
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] font-semibold mb-3">What are you preparing for?</p>
                <div className="grid grid-cols-2 gap-3 mb-8">
                    {ROLE_CARDS.map(({ key, icon, label, desc }) => (
                        <button
                            key={key}
                            onClick={() => setRole(key)}
                            className={`glass-card p-5 text-left transition-all duration-200 ${
                                role === key
                                    ? "border-[var(--accent)]/50 bg-[var(--accent)]/5 shadow-[0_0_24px_rgba(74,222,128,0.08)]"
                                    : "hover:border-white/15"
                            }`}
                        >
                            <span className="text-2xl mb-3 block">{icon}</span>
                            <p className="font-bold text-sm text-white mb-1">{label}</p>
                            <p className="text-[var(--text-muted)] text-xs leading-relaxed">{desc}</p>
                            {role === key && (
                                <span className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Custom role input */}
                {role === "custom" && (
                    <div className="mb-8">
                        <input
                            type="text"
                            value={customRole}
                            onChange={(e) => setCustomRole(e.target.value)}
                            placeholder="e.g. Fintech, Gaming, DevOps, iOS..."
                            className="w-full bg-[var(--bg-interactive)] border border-white/[0.08] focus:border-[var(--accent)]/50 rounded-xl px-4 py-3 text-sm text-white placeholder-[var(--text-muted)] outline-none transition"
                            autoFocus
                        />
                    </div>
                )}

                {/* Intensity Toggle */}
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] font-semibold mb-3">Intensity</p>
                <div className="flex gap-3 mb-8">
                    {INTENSITIES.map(({ key, label, color }) => (
                        <button
                            key={key}
                            onClick={() => setDifficulty(key)}
                            className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                                difficulty === key ? color : "border-white/[0.06] text-[var(--text-muted)] hover:border-white/15 hover:text-white"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Time Limit Info Badge */}
                <div className="mb-10 p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <span className="text-base">⏱️</span>
                        <div>
                            <p className="text-xs font-semibold text-white">45-Minute Timed Round</p>
                            <p className="text-[10px] text-[var(--text-muted)]">Standard FAANG & industry technical screening duration.</p>
                        </div>
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 font-semibold">
                        45m Fixed
                    </span>
                </div>

                {/* CTA */}
                <button
                    onClick={handleStart}
                    disabled={role === "custom" && !customRole.trim()}
                    className="w-full btn btn-primary btn-lg"
                >
                    Start Interview →
                </button>

                <button onClick={() => navigate("/dashboard")} className="w-full text-center text-[var(--text-muted)] text-xs mt-4 hover:text-white transition">
                    ← Back to Dashboard
                </button>
                </div>
            </div>
        </div>
    );
};

export default MockSetupScreen;
