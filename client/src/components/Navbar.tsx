import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../app/store";
import { useNavigate } from "react-router-dom";
import { logout, setBaseRole } from "../features/auth/authSlice";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import api from "../utils/api";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";

const Navbar = () => {
    const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [roleMenuOpen, setRoleMenuOpen] = useState(false);
    const [switchingRole, setSwitchingRole] = useState(false);
    const roleMenuRef = useRef<HTMLDivElement>(null);

    const isInterviewer = user?.role === "INTERVIEWER";

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
                setRoleMenuOpen(false);
            }
        };
        if (roleMenuOpen) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [roleMenuOpen]);

    const handleSwitchRole = async (targetRole: "INTERVIEWER" | "CANDIDATE") => {
        if (user?.role === targetRole) {
            setRoleMenuOpen(false);
            return;
        }
        try {
            setSwitchingRole(true);
            const res = await api.patch("/auth/role", { role: targetRole });
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
            toast.success(`Role switched to ${targetRole === "INTERVIEWER" ? "Interviewer 🎯" : "Candidate 💻"}`);
        } catch {
            toast.error("Failed to switch role.");
        } finally {
            setSwitchingRole(false);
            setRoleMenuOpen(false);
        }
    };

    const handleLogout = async () => {
        try {
            await api.post("/auth/logout");
        } catch {
            // Ignore error if network fails during logout
        } finally {
            localStorage.removeItem("accessToken");
            dispatch(logout());
            navigate("/");
        }
    };

    return (
        <nav className="flex items-center justify-between px-8 py-4 border-b border-white/[0.04] backdrop-blur-md bg-[var(--bg-deep)]/80 sticky top-0 z-50" aria-label="Main navigation">
            {/* Logo — proper link instead of onClick h1 */}
            <a
                href={isAuthenticated ? "/dashboard" : "/"}
                onClick={(e) => { e.preventDefault(); navigate(isAuthenticated ? "/dashboard" : "/"); }}
                className="text-white text-xl font-bold tracking-tight select-none no-underline hover:opacity-90 transition-opacity"
                aria-label="LiveCode AI — Go to home"
            >
                Live<span className="text-[var(--accent)]">Code</span>
                <span className="text-[10px] text-[var(--text-muted)] ml-2 font-medium tracking-wider">AI</span>
            </a>

            {isAuthenticated ? (
                <div className="flex items-center gap-2" role="toolbar" aria-label="User actions">
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="btn btn-ghost btn-sm"
                        aria-label="Dashboard"
                    >
                        Dashboard
                    </button>

                    <NotificationBell />

                    <div className="w-px h-4 bg-white/10 mx-1" aria-hidden="true" />

                    {/* Role Selector Badge */}
                    <div className="relative" ref={roleMenuRef}>
                        <button
                            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                            disabled={switchingRole}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                                isInterviewer
                                    ? "bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                            }`}
                            aria-label={`Current role: ${user?.role}. Click to switch.`}
                            aria-expanded={roleMenuOpen}
                        >
                            <span>{isInterviewer ? "🎯 Interviewer" : "💻 Candidate"}</span>
                            <span className="text-[10px] opacity-60">▾</span>
                        </button>

                        {roleMenuOpen && (
                            <div className="absolute right-0 top-9 bg-[var(--bg-surface)] border border-white/[0.08] rounded-xl overflow-hidden z-50 w-48 shadow-xl shadow-black/40 p-1.5 animate-page-fade">
                                <p className="text-[10px] uppercase font-semibold text-[var(--text-muted)] px-3 py-1 tracking-wider">
                                    Switch Active Role
                                </p>
                                <button
                                    onClick={() => handleSwitchRole("INTERVIEWER")}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition hover:bg-white/[0.05] ${
                                        isInterviewer ? "text-[var(--accent)] font-bold bg-[var(--accent)]/5" : "text-[var(--text-secondary)]"
                                    }`}
                                >
                                    <span>🎯</span>
                                    <span>Interviewer</span>
                                    {isInterviewer && <span className="ml-auto text-[var(--accent)] text-[10px]">✓</span>}
                                </button>
                                <button
                                    onClick={() => handleSwitchRole("CANDIDATE")}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition hover:bg-white/[0.05] ${
                                        !isInterviewer ? "text-[var(--accent)] font-bold bg-[var(--accent)]/5" : "text-[var(--text-secondary)]"
                                    }`}
                                >
                                    <span>💻</span>
                                    <span>Candidate</span>
                                    {!isInterviewer && <span className="ml-auto text-[var(--accent)] text-[10px]">✓</span>}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* User info */}
                    <div className="flex items-center gap-2 px-2" aria-label={`Signed in as ${user?.name || "User"}`}>
                        {user?.avatar ? (
                            <img src={user.avatar} alt={`${user.name}'s avatar`} className="w-6 h-6 rounded-full ring-1 ring-white/10" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[10px] text-[var(--accent)] font-bold" aria-hidden="true">
                                {user?.name?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                        )}
                        <span className="text-xs text-[var(--text-secondary)] font-medium hidden sm:inline">
                            {user?.name?.split(" ")[0] || "User"}
                        </span>
                    </div>

                    <ThemeToggle />

                    <button
                        onClick={handleLogout}
                        className="btn btn-ghost btn-sm text-[var(--text-muted)] hover:text-[var(--danger)]"
                        aria-label="Logout"
                    >
                        Logout
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <a
                        href={`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/google`}
                        className="btn btn-primary btn-sm no-underline"
                        role="button"
                        aria-label="Sign in with Google"
                    >
                        Sign in with Google
                    </a>
                </div>
            )}
        </nav>
    );
};

export default Navbar;