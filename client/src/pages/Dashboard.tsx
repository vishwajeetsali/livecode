import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials, resetToBaseRole, setBaseRole } from "../features/auth/authSlice";
import type { Session, Problem } from "../types";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";
import type { RootState } from "../app/store";

import JoinRoomCard from "../components/dashboard/JoinRoomCard";
import SessionsList from "../components/dashboard/SessionsList";
import ProblemBank from "../components/dashboard/ProblemBank";
import AnalyticsPanel from "../components/dashboard/AnalyticsPanel";

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
    const [activeTab, setActiveTab] = useState<"sessions" | "problems" | "analytics">("sessions");
    const [loading, setLoading] = useState(true);

    const fetchSessions = async () => {
        try {
            const res = await api.get("/sessions/my");
            const raw = res.data;
            setSessions(Array.isArray(raw) ? raw : (raw?.items || raw?.data || []));
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
        dispatch(resetToBaseRole());
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
    }, [isInterviewer, dispatch]);

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
        let cleanId = roomId.trim();
        if (!cleanId) { toast.error("Please enter a room ID or paste the room link."); return; }
        
        // Auto-extract room ID if user pasted full URL (e.g., http://localhost:5173/room/cly...)
        if (cleanId.includes("/room/")) {
            const parts = cleanId.split("/room/");
            cleanId = parts[parts.length - 1] || cleanId;
        }

        // Strip any trailing query parameters, hash anchors, or path delimiters
        cleanId = cleanId.split("?")[0]?.split("#")[0]?.split("/")[0]?.trim() || cleanId;

        try {
            setLoadingJoin(true);
            const res = await api.post("/rooms/join", { roomId: cleanId });
            const newToken = res.data.accessToken;
            localStorage.setItem("accessToken", newToken);
            const decoded = jwtDecode<{ userId: string; role: "INTERVIEWER" | "CANDIDATE"; name?: string; email?: string; avatar?: string | null }>(newToken);
            dispatch(setCredentials({
                user: { id: decoded.userId, name: decoded.name || "", email: decoded.email || "", avatar: decoded.avatar || undefined, role: decoded.role },
                accessToken: newToken,
            }));
            navigate(`/room/${cleanId}`);
        } catch (err: any) {
            const msg = err?.response?.data?.error?.message || "Room not found or already ended.";
            toast.error(msg);
            setLoadingJoin(false);
        }
    };

    const [switchingRole, setSwitchingRole] = useState(false);

    const handleToggleRole = async () => {
        const newRole = isInterviewer ? "CANDIDATE" : "INTERVIEWER";
        try {
            setSwitchingRole(true);
            const res = await api.patch("/auth/role", { role: newRole });
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
            toast.success(`Role switched to ${newRole === "INTERVIEWER" ? "Interviewer 🎯" : "Candidate 💻"}`);
        } catch {
            toast.error("Failed to switch role.");
        } finally {
            setSwitchingRole(false);
        }
    };

    const activeSession = sessions.find((s) => !s.endTime);

    const handleEndSession = async (targetRoomId: string) => {
        if (!window.confirm("Are you sure you want to end this interview session? This will generate the performance report.")) return;
        try {
            const res = await api.post("/rooms/end", { roomId: targetRoomId });
            toast.success("Session ended.");
            if (res.data?.sessionId) {
                navigate(`/report/${res.data.sessionId}`);
            } else {
                fetchSessions();
            }
        } catch {
            toast.error("Failed to end session.");
        }
    };

    const completedCount = sessions.filter((s) => s.endTime).length;
    const reportCount = sessions.filter((s) => s.report).length;

    return (
        <div className="min-h-screen bg-[var(--bg-deep)] text-white animate-page-fade">
            {/* Ambient glow */}
            <div className="fixed top-[-100px] right-[-100px] w-[400px] h-[400px] bg-green-500/[0.06] rounded-full blur-[120px] pointer-events-none" aria-hidden="true" />
            <div className="fixed bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none" aria-hidden="true" />

            <Navbar />

            <main id="main-content" className="max-w-5xl mx-auto px-6 py-14 relative">

                {/* ─── Header ──────────────────────────────────────────────── */}
                <div className="mb-10">
                    <p className="text-[var(--accent)] text-xs font-semibold tracking-[0.2em] uppercase mb-2">Dashboard</p>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h1 className="text-4xl font-black tracking-tight">
                            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}<span className="text-[var(--accent)]">.</span>
                        </h1>

                        {/* Interactive Role Switcher Pill */}
                        <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.08] px-3.5 py-1.5 rounded-full w-fit">
                            <span className="text-xs text-[var(--text-muted)]">Role:</span>
                            <span className={`text-xs font-bold ${isInterviewer ? "text-purple-400" : "text-emerald-400"}`}>
                                {isInterviewer ? "🎯 Interviewer" : "💻 Candidate"}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <button
                                onClick={handleToggleRole}
                                disabled={switchingRole}
                                className="text-xs text-[var(--accent)] hover:underline font-semibold cursor-pointer disabled:opacity-50 transition"
                                aria-label="Switch between Interviewer and Candidate role"
                            >
                                {switchingRole ? "Switching..." : `Switch to ${isInterviewer ? "Candidate" : "Interviewer"}`}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3">
                        <span className="text-[var(--text-muted)] text-sm">{sessions.length} sessions</span>
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                        <span className="text-[var(--text-muted)] text-sm">{completedCount} completed</span>
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                        <span className="text-[var(--text-muted)] text-sm">{reportCount} reports</span>
                    </div>
                </div>

                {/* ─── Active Session Alert Banner ──────────────────────────── */}
                {activeSession && (
                    <div className="mb-8 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-lg shrink-0 animate-pulse">
                                ⚡
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Interview in Progress</span>
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                    Room: <span className="font-mono text-white">{activeSession.roomId}</span> • Problem: <span className="text-white font-medium">{activeSession.room?.problem || "Coding Interview"}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 w-full sm:w-auto">
                            <button
                                onClick={() => navigate(`/room/${activeSession.roomId}`)}
                                className="btn btn-primary btn-sm flex-1 sm:flex-initial whitespace-nowrap"
                            >
                                Rejoin Room →
                            </button>
                            {isInterviewer && (
                                <button
                                    onClick={() => handleEndSession(activeSession.roomId)}
                                    className="btn btn-danger btn-sm whitespace-nowrap"
                                >
                                    End Session
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── Action Cards ────────────────────────────────────────── */}
                {isInterviewer ? (
                    <div className="glass-card px-8 py-6 mb-10 flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden">
                        <div className="absolute -top-16 -right-16 w-48 h-48 bg-[var(--accent)]/5 rounded-full blur-3xl pointer-events-none" />
                        <div className="relative">
                            <p className="text-[10px] text-[var(--accent)] tracking-[0.2em] uppercase font-semibold mb-1.5">New Session</p>
                            <h2 className="text-lg font-black">Start an Interview</h2>
                            <p className="text-[var(--text-muted)] text-sm mt-1">Create a room and share the link with your candidate.</p>
                        </div>
                        <button
                            onClick={() => handleCreateRoom("real")}
                            disabled={loadingCreate}
                            className="relative btn btn-primary btn-md whitespace-nowrap px-10"
                        >
                            {loadingCreate ? "Creating..." : "🎙️ Start Interview"}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                        <JoinRoomCard roomId={roomId} setRoomId={setRoomId} loadingJoin={loadingJoin} onJoinRoom={handleJoinRoom} />
                        {/* Mock with AI Card */}
                        <div className="glass-card p-8 relative overflow-hidden group flex flex-col justify-between">
                            <div className="absolute -top-12 -left-12 w-40 h-40 bg-purple-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/10 transition-all duration-500" />
                            <div>
                                <p className="text-[10px] text-purple-400 tracking-[0.2em] uppercase font-semibold mb-4">Practice</p>
                                <h2 className="text-xl font-black mb-1">Mock with AI</h2>
                                <p className="text-[var(--text-muted)] text-sm mb-7">Practice with an AI interviewer to sharpen your skills.</p>
                            </div>
                            <button
                                onClick={() => handleCreateRoom("mock")}
                                className="w-full btn btn-secondary btn-md"
                            >
                                🤖 Start Mock
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex border border-white/[0.06] mb-8 bg-white/[0.02] rounded-xl overflow-hidden p-1 max-w-md">
                    <button
                        onClick={() => setActiveTab("sessions")}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                            activeTab === "sessions" ? "bg-[var(--accent)] text-black shadow-lg shadow-green-400/10" : "text-[var(--text-muted)] hover:text-white"
                        }`}
                    >
                        Sessions
                    </button>
                    <button
                        onClick={() => setActiveTab("analytics")}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                            activeTab === "analytics" ? "bg-[var(--accent)] text-black shadow-lg shadow-green-400/10" : "text-[var(--text-muted)] hover:text-white"
                        }`}
                    >
                        Analytics
                    </button>
                    {isInterviewer && (
                        <button
                            onClick={() => setActiveTab("problems")}
                            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                                activeTab === "problems" ? "bg-[var(--accent)] text-black shadow-lg shadow-green-400/10" : "text-[var(--text-muted)] hover:text-white"
                            }`}
                        >
                            Problem Bank
                        </button>
                    )}
                </div>

                {/* ─── Content ─────────────────────────────────────────────── */}
                {activeTab === "sessions" && (
                    <SessionsList
                        sessions={sessions}
                        loading={loading}
                        isInterviewer={isInterviewer}
                        onEndSession={handleEndSession}
                    />
                )}

                {activeTab === "analytics" && (
                    <AnalyticsPanel sessions={sessions} />
                )}

                {activeTab === "problems" && isInterviewer && (
                    <ProblemBank problems={problems} loading={loading} onRefresh={fetchProblems} />
                )}
            </main>
        </div>
    );
};

export default Dashboard;