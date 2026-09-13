import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setBaseRole } from "../features/auth/authSlice";
import { jwtDecode } from "jwt-decode";
import api from "../utils/api";
import toast from "react-hot-toast";

const roles = [
    {
        value: "INTERVIEWER" as const,
        emoji: "🎯",
        title: "Interviewer",
        description: "Host live coding interviews, manage a problem bank, and review candidate performance with AI-powered reports.",
        features: ["Create interview rooms", "Manage problem bank", "End sessions & generate reports", "Record & transcribe interviews"],
    },
    {
        value: "CANDIDATE" as const,
        emoji: "💻",
        title: "Candidate",
        description: "Join live interviews, practice with AI mock sessions, and track your performance over time.",
        features: ["Join interview rooms", "Practice with AI mock interviews", "Get AI hints & code review", "View performance reports"],
    },
];

const RoleSelect = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [selected, setSelected] = useState<"INTERVIEWER" | "CANDIDATE" | null>(null);
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!selected) return;
        try {
            setLoading(true);
            const res = await api.patch("/auth/role", { role: selected });
            const newToken = res.data.accessToken;
            localStorage.setItem("accessToken", newToken);

            const decoded = jwtDecode<{ userId: string; role: "INTERVIEWER" | "CANDIDATE"; name?: string; email?: string; avatar?: string | null }>(newToken);
            dispatch(setBaseRole({
                user: {
                    id: decoded.userId,
                    name: decoded.name || "",
                    email: decoded.email || "",
                    avatar: decoded.avatar || undefined,
                    role: decoded.role,
                },
                accessToken: newToken,
            }));

            toast.success(`Welcome! You're set up as ${selected === "INTERVIEWER" ? "an Interviewer" : "a Candidate"}.`);
            navigate("/dashboard");
        } catch {
            toast.error("Failed to set role. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col items-center justify-center px-4 animate-page-fade">
            <div className="max-w-2xl w-full text-center mb-10">
                <h1 className="text-3xl font-black mb-3">
                    Welcome to <span className="text-[var(--accent)]">LiveCode</span>
                </h1>
                <p className="text-[var(--text-muted)] text-sm">
                    How will you be using LiveCode? You can change this later in settings.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl mb-8">
                {roles.map((role) => (
                    <button
                        key={role.value}
                        onClick={() => setSelected(role.value)}
                        className={`flex-1 text-left p-6 rounded-2xl border-2 transition-all duration-200 cursor-pointer group ${
                            selected === role.value
                                ? "border-[var(--accent)] bg-[var(--accent)]/[0.06] shadow-lg shadow-green-400/10"
                                : "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                        }`}
                    >
                        <div className="text-3xl mb-3">{role.emoji}</div>
                        <h2 className={`text-lg font-bold mb-2 ${selected === role.value ? "text-[var(--accent)]" : "text-white"}`}>
                            {role.title}
                        </h2>
                        <p className="text-[var(--text-muted)] text-xs leading-relaxed mb-4">
                            {role.description}
                        </p>
                        <ul className="space-y-1.5">
                            {role.features.map((f, i) => (
                                <li key={i} className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                                    <span className={`text-[10px] ${selected === role.value ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>✓</span>
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </button>
                ))}
            </div>

            <button
                onClick={handleConfirm}
                disabled={!selected || loading}
                className="btn btn-primary btn-md min-w-[200px] disabled:opacity-40"
            >
                {loading ? "Setting up..." : "Continue →"}
            </button>
        </div>
    );
};

export default RoleSelect;
