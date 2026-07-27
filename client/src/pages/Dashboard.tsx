import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials } from "../features/auth/authSlice";
import type { Session, Problem } from "../types";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";
import type { RootState } from "../app/store";

const difficultyStyle: Record<string, string> = {
    EASY: "border-green-400/30 text-green-400 bg-green-400/5",
    MEDIUM: "border-yellow-400/30 text-yellow-400 bg-yellow-400/5",
    HARD: "border-red-400/30 text-red-400 bg-red-400/5",
};

const relativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
};

const Dashboard = () => {
    const [roomId, setRoomId] = useState("");
    const [loadingCreate, setLoadingCreate] = useState(false);
    const [loadingJoin, setLoadingJoin] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [sessions, setSessions] = useState<Session[]>([]);

    const user = useSelector((state: RootState) => state.auth.user);
    const isInterviewer = user?.role === "INTERVIEWER";

    const [problems, setProblems] = useState<Problem[]>([]);
    const [activeTab, setActiveTab] = useState<"sessions" | "problems">("sessions");
    const [showAddForm, setShowAddForm] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form fields
    const [newTitle, setNewTitle] = useState("");
    const [newDifficulty, setNewDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("EASY");
    const [newDescription, setNewDescription] = useState("");
    const [newExampleInput, setNewExampleInput] = useState("");
    const [newExampleOutput, setNewExampleOutput] = useState("");
    const [constraintInput, setConstraintInput] = useState("");
    const [constraintsList, setConstraintsList] = useState<string[]>([]);

    const fetchSessions = async () => {
        try {
            const res = await api.get("/sessions/my");
            setSessions(res.data);
        } catch {
            toast.error("Failed to load sessions.");
        }
    };

    const fetchProblems = async () => {
        try {
            const res = await api.get("/problems");
            setProblems(res.data);
        } catch {
            toast.error("Failed to load problems.");
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const promises = [fetchSessions()];
                if (isInterviewer) {
                    promises.push(fetchProblems());
                }
                await Promise.all(promises);
            } catch {
                // errors handled in individual fetch functions
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [isInterviewer]);

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
            
            // Reset form
            setNewTitle("");
            setNewDifficulty("Easy");
            setNewDescription("");
            setNewExampleInput("");
            setNewExampleOutput("");
            setConstraintsList([]);
            setShowAddForm(false);
            
            fetchProblems();
        } catch (err) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || "Failed to create problem.");
        }
    };

    const handleDeleteProblem = async (problemId: string) => {
        if (!confirm("Are you sure you want to delete this problem?")) return;
        try {
            await api.delete(`/problems/${problemId}`);
            toast.success("Problem deleted.");
            fetchProblems();
        } catch {
            toast.error("Failed to delete problem.");
        }
    };

    const handleCreateRoom = async (mode: string) => {
        if (mode === "mock") {
            navigate("/mock");
            return;
        }
        try {
            setLoadingCreate(true);
            const res = await api.post("/rooms/create", { mode: "REAL" });
            const newToken = res.data.accessToken;
            localStorage.setItem("accessToken", newToken);
            const decoded = jwtDecode<{ userId: string; role: "INTERVIEWER" | "CANDIDATE"; name?: string; email?: string; avatar?: string | null }>(newToken);
            dispatch(setCredentials({
                user: { id: decoded.userId, name: decoded.name || "", email: decoded.email || "", avatar: decoded.avatar || undefined, role: decoded.role },
                accessToken: newToken,
            }));
            navigate(`/room/${res.data.id}`);
        } catch {
            toast.error("Failed to create room.");
            setLoadingCreate(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!roomId) { toast.error("Please enter a room ID."); return; }
        try {
            setLoadingJoin(true);
            const res = await api.post("/rooms/join", { roomId });
            const newToken = res.data.accessToken;
            localStorage.setItem("accessToken", newToken);
            const decoded = jwtDecode<{ userId: string; role: "INTERVIEWER" | "CANDIDATE"; name?: string; email?: string; avatar?: string | null }>(newToken);
            dispatch(setCredentials({
                user: { id: decoded.userId, name: decoded.name || "", email: decoded.email || "", avatar: decoded.avatar || undefined, role: decoded.role },
                accessToken: newToken,
            }));
            navigate(`/room/${roomId}`);
        } catch {
            toast.error("Room not found or already ended.");
            setLoadingJoin(false);
        }
    };

    const completedCount = sessions.filter(s => s.endTime).length;
    const reportCount = sessions.filter(s => s.report).length;

    return (
        <div className="min-h-screen bg-[var(--bg-deep)] text-white animate-page-fade">
            {/* Ambient glow */}
            <div className="fixed top-[-100px] right-[-100px] w-[400px] h-[400px] bg-green-500/[0.06] rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

            <Navbar />

            <div className="max-w-5xl mx-auto px-6 py-14 relative">

                {/* ─── Header ──────────────────────────────────────────────── */}
                <div className="mb-10">
                    <p className="text-[var(--accent)] text-xs font-semibold tracking-[0.2em] uppercase mb-2">Dashboard</p>
                    <h1 className="text-4xl font-black tracking-tight">
                        Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}<span className="text-[var(--accent)]">.</span>
                    </h1>
                    <div className="flex items-center gap-4 mt-3">
                        <span className="text-[var(--text-muted)] text-sm">{sessions.length} sessions</span>
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                        <span className="text-[var(--text-muted)] text-sm">{completedCount} completed</span>
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                        <span className="text-[var(--text-muted)] text-sm">{reportCount} reports</span>
                    </div>
                </div>

                {/* ─── Action Cards ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">

                    {/* Create Room */}
                    <div className="glass-card p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 rounded-full blur-3xl group-hover:bg-[var(--accent)]/10 transition-all duration-500" />
                        <p className="text-[10px] text-[var(--accent)] tracking-[0.2em] uppercase font-semibold mb-4">New Session</p>
                        <h2 className="text-xl font-black mb-1">Create Room</h2>
                        <p className="text-[var(--text-muted)] text-sm mb-7">Start a session as interviewer or practice solo with AI.</p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => handleCreateRoom("real")}
                                disabled={loadingCreate}
                                className="w-full btn btn-primary btn-md"
                            >
                                {loadingCreate ? "Creating..." : "🎙️ Real Interview"}
                            </button>
                            <button
                                onClick={() => handleCreateRoom("mock")}
                                className="w-full btn btn-secondary btn-md"
                            >
                                🤖 Mock with AI
                            </button>
                        </div>
                    </div>

                    {/* Join Room */}
                    <div className="glass-card p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/5 rounded-full blur-3xl group-hover:bg-emerald-400/10 transition-all duration-500" />
                        <p className="text-[10px] text-[var(--accent)] tracking-[0.2em] uppercase font-semibold mb-4">Join Existing</p>
                        <h2 className="text-xl font-black mb-1">Join Room</h2>
                        <p className="text-[var(--text-muted)] text-sm mb-7">Got a room ID? Jump straight into the interview.</p>
                        <input
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            placeholder="Paste Room ID here..."
                            className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-[var(--text-muted)] mb-3 outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20 transition-all text-sm font-mono"
                        />
                        <button
                            onClick={handleJoinRoom}
                            disabled={loadingJoin}
                            className="w-full btn btn-primary btn-md"
                        >
                            {loadingJoin ? "Joining..." : "Join Room →"}
                        </button>
                    </div>
                </div>

                {/* ─── Tab Bar ─────────────────────────────────────────────── */}
                {isInterviewer && (
                    <div className="flex border border-white/[0.06] mb-8 bg-white/[0.02] rounded-xl overflow-hidden p-1 max-w-xs">
                        <button
                            onClick={() => setActiveTab("sessions")}
                            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                                activeTab === "sessions" ? "bg-[var(--accent)] text-black shadow-lg shadow-green-400/10" : "text-[var(--text-muted)] hover:text-white"
                            }`}
                        >
                            Sessions
                        </button>
                        <button
                            onClick={() => setActiveTab("problems")}
                            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                                activeTab === "problems" ? "bg-[var(--accent)] text-black shadow-lg shadow-green-400/10" : "text-[var(--text-muted)] hover:text-white"
                            }`}
                        >
                            Problem Bank
                        </button>
                    </div>
                )}

                {/* ─── Sessions Tab ────────────────────────────────────────── */}
                {(activeTab === "sessions" || !isInterviewer) && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold">Past Sessions</h2>
                            <span className="text-[10px] text-[var(--text-muted)] border border-white/[0.06] px-3 py-1 rounded-full font-mono">{sessions.length} sessions</span>
                        </div>

                        {loading ? (
                            <div className="flex flex-col gap-3">
                                {[1, 2, 3].map((n) => (
                                    <div key={n} className="glass-card px-6 py-4 flex items-center justify-between">
                                        <div className="flex flex-col gap-2 w-1/3">
                                            <div className="h-4 skeleton w-full" />
                                            <div className="h-3 skeleton w-2/3" />
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="h-6 skeleton w-20 rounded-full" />
                                            <div className="h-6 skeleton w-24 rounded-full" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : sessions.length === 0 ? (
                            <div className="border border-dashed border-white/[0.08] rounded-2xl p-16 text-center">
                                <p className="text-3xl mb-3">🎯</p>
                                <p className="text-[var(--text-secondary)] font-medium text-sm">No sessions yet</p>
                                <p className="text-[var(--text-muted)] text-xs mt-1">Create or join a room to get started</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2.5">
                                {sessions.map((session) => (
                                    <div key={session.id} className="glass-card px-6 py-4 flex items-center justify-between group">
                                        <div>
                                            <p className="font-semibold text-sm flex items-center gap-2">
                                                {session.room?.problem || "Coding Interview"}
                                                <span className="text-[var(--text-muted)] font-mono text-[10px] font-normal">
                                                    {session.roomId.length > 12 ? `${session.roomId.slice(0, 8)}...` : session.roomId}
                                                </span>
                                            </p>
                                            <p className="text-[var(--text-muted)] text-xs mt-1">{relativeTime(session.startTime)}</p>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium ${session.endTime ? "border-green-400/20 text-green-400 bg-green-400/5" : "border-yellow-400/20 text-yellow-400 bg-yellow-400/5"}`}>
                                                {session.endTime ? "Completed" : "In Progress"}
                                            </span>
                                            {session.report && (
                                                <button
                                                    onClick={() => navigate(`/report/${session.id}`)}
                                                    className="text-[10px] border border-white/[0.08] px-3 py-1 rounded-full text-[var(--text-muted)] hover:text-white hover:border-white/20 transition font-medium"
                                                >
                                                    View Report →
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Problem Bank Tab ────────────────────────────────────── */}
                {activeTab === "problems" && isInterviewer && (
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
                                            onClick={() => handleDeleteProblem(prob.id)}
                                            className="text-[10px] bg-red-500/10 border border-red-500/15 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-xl transition font-medium opacity-0 group-hover:opacity-100"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;