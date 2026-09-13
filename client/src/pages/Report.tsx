import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import type { Report as IReport } from "../types";
import { safeStr } from "../utils/helper";

// ─── Custom SVG Skills Radar Chart ───────────────────────────────────────────
const SkillsRadar = ({ codeScore = 0, commScore = 0, psScore = 0 }: { codeScore: number; commScore: number; psScore: number }) => {
    const center = 130;
    const maxR = 80;

    const angles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
    const scores = [codeScore, commScore, psScore];
    const labels = ["Coding Logic", "Communication", "Problem Solving"];
    const colors = ["#6366f1", "#3b82f6", "#eab308"];

    const gridLevels = [0.25, 0.5, 0.75, 1.0];

    const getPolyPoints = (factor: number) => {
        return angles
            .map((angle) => {
                const r = maxR * factor;
                const x = center + r * Math.cos(angle);
                const y = center + r * Math.sin(angle);
                return `${x},${y}`;
            })
            .join(" ");
    };

    const dataPoints = scores
        .map((score, i) => {
            const factor = Math.max(0, Math.min(100, score)) / 100;
            const r = maxR * factor;
            const x = center + r * Math.cos(angles[i]);
            const y = center + r * Math.sin(angles[i]);
            return `${x},${y}`;
        })
        .join(" ");

    return (
        <div className="w-full h-full flex items-center justify-center relative">
            <svg viewBox="0 0 260 260" className="w-full h-full max-w-[260px] max-h-[260px]">
                <defs>
                    <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
                    </linearGradient>
                </defs>

                {gridLevels.map((lvl) => (
                    <polygon
                        key={lvl}
                        points={getPolyPoints(lvl)}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeWidth="1"
                        strokeDasharray={lvl === 1 ? "none" : "3,3"}
                    />
                ))}

                {angles.map((angle, i) => {
                    const x2 = center + maxR * Math.cos(angle);
                    const y2 = center + maxR * Math.sin(angle);
                    return (
                        <line
                            key={i}
                            x1={center}
                            y1={center}
                            x2={x2}
                            y2={y2}
                            stroke="rgba(255, 255, 255, 0.12)"
                            strokeWidth="1"
                        />
                    );
                })}

                <polygon
                    points={dataPoints}
                    fill="url(#radarFill)"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    className="transition-all duration-700 ease-out"
                />

                {scores.map((score, i) => {
                    const factor = Math.max(0, Math.min(100, score)) / 100;
                    const r = maxR * factor;
                    const cx = center + r * Math.cos(angles[i]);
                    const cy = center + r * Math.sin(angles[i]);

                    const lx = center + (maxR + 24) * Math.cos(angles[i]);
                    const ly = center + (maxR + 14) * Math.sin(angles[i]);

                    const anchor = i === 0 ? "middle" : i === 1 ? "start" : "end";

                    return (
                        <g key={i}>
                            <circle cx={cx} cy={cy} r="4" fill={colors[i]} stroke="#0a0a0f" strokeWidth="2" />
                            <text
                                x={lx}
                                y={ly}
                                fill="#94a3b8"
                                fontSize="10"
                                fontWeight="600"
                                textAnchor={anchor}
                                dominantBaseline="middle"
                            >
                                {labels[i]} ({score})
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

const Report = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [report, setReport] = useState<IReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        let pollTimer: ReturnType<typeof setTimeout> | null = null;
        let attempts = 0;
        const maxAttempts = 6;

        const fetchReport = async () => {
            try {
                const res = await api.get(`/reports/${id}`);
                if (isMounted) {
                    setReport(res.data);
                    setError(null);
                    setLoading(false);
                }
            } catch (err: unknown) {
                const apiErr = err as { response?: { status?: number; data?: { error?: { message?: string } } } };
                const status = apiErr?.response?.status;

                // If report is still in-flight/being generated by host (404), poll up to maxAttempts
                if (status === 404 && attempts < maxAttempts) {
                    attempts++;
                    pollTimer = setTimeout(fetchReport, 1500);
                    return;
                }

                if (isMounted) {
                    const msg = apiErr?.response?.data?.error?.message || "Failed to load report.";
                    setError(msg);
                    setLoading(false);
                }
            }
        };

        fetchReport();

        return () => {
            isMounted = false;
            if (pollTimer) clearTimeout(pollTimer);
        };
    }, [id]);

    if (error || (!loading && !report)) return (
        <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col items-center justify-center gap-3">
            <p className="text-xl font-bold text-red-400">Report Not Found</p>
            <p className="text-[var(--text-muted)] text-sm">{error || "This report does not exist or you do not have permission to view it."}</p>
            <button onClick={() => navigate("/dashboard")} className="btn btn-secondary btn-sm mt-3">
                ← Back to Dashboard
            </button>
        </div>
    );

    // ─── Loading Skeleton ────────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen bg-[var(--bg-deep)] text-white">
            <div className="max-w-5xl mx-auto px-6 py-16">
                <div className="mb-10 flex justify-between items-start">
                    <div className="flex flex-col gap-3 w-1/3">
                        <div className="h-4 skeleton w-1/2" />
                        <div className="h-10 skeleton w-full" />
                        <div className="h-4 skeleton w-2/3 mt-2" />
                    </div>
                    <div className="h-10 skeleton rounded-full w-28" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="glass-card p-6 h-[350px] flex items-center justify-center">
                        <div className="w-56 h-56 rounded-full border-4 border-dashed border-white/[0.04] flex items-center justify-center">
                            <div className="w-36 h-36 rounded-full border-4 border-dashed border-white/[0.04]" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        {[1, 2, 3].map((n) => (
                            <div key={n} className="glass-card p-5 flex items-center justify-between h-24">
                                <div className="flex flex-col gap-2 w-2/3">
                                    <div className="h-4 skeleton w-1/3" />
                                    <div className="h-3 skeleton w-full" />
                                </div>
                                <div className="h-8 skeleton w-16" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="glass-card p-8 h-32 mb-5" />
                <div className="glass-card p-8 h-32 mb-10" />
            </div>
        </div>
    );

    const verdictColors: Record<string, string> = {
        "Strong Hire": "text-green-400 border-green-400/20 bg-green-400/10",
        "Hire": "text-blue-400 border-blue-400/20 bg-blue-400/10",
        "No Hire": "text-red-400 border-red-400/20 bg-red-400/10",
    };

    const verdict = report?.verdict || "";
    const verdictColor = verdictColors[verdict] || "text-[var(--text-muted)] border-white/[0.08] bg-white/[0.03]";

    return (
        <div className="min-h-screen bg-[var(--bg-deep)] text-white animate-page-fade">
            <div className="max-w-5xl mx-auto px-6 py-16">

                {/* ─── Header ─────────────────────────────────────────────── */}
                <div className="mb-10 flex justify-between items-start">
                    <div>
                        <p className="text-[var(--accent)] text-xs font-semibold tracking-[0.2em] uppercase mb-2">Session Report</p>
                        <h1 className="text-3xl font-black tracking-tight">Interview Analysis</h1>
                        <p className="text-[var(--text-muted)] mt-2 text-sm">{report?.session?.room?.problem || "Coding Interview"}</p>
                    </div>
                    <div className={`inline-block border px-5 py-2 rounded-full text-xs font-bold ${verdictColor}`}>
                        {safeStr(report?.verdict)}
                    </div>
                </div>

                {/* ─── Analytics Grid ─────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

                    {/* Radar Chart */}
                    <div className="glass-card p-6 flex flex-col justify-center items-center" style={{ height: 340, minHeight: 340 }}>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] self-start mb-4 font-semibold">Skills Breakdown</p>
                        <div style={{ width: "100%", height: "85%", minHeight: 240 }}>
                            <SkillsRadar
                                codeScore={report?.codeScore || 0}
                                commScore={report?.communicationScore || 0}
                                psScore={report?.problemSolvingScore || 0}
                            />
                        </div>
                    </div>

                    {/* Score Cards */}
                    <div className="flex flex-col gap-4">
                        {/* Coding */}
                        <div className="glass-card p-5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] mb-1 font-semibold">Coding Logic</p>
                                <p className="text-[var(--text-muted)] text-xs">Evaluates syntax, logic, and complexity.</p>
                            </div>
                            <div className="text-right">
                                <span className="text-3xl font-black text-[var(--accent)]">{report?.codeScore}</span>
                                <span className="text-[var(--text-muted)] text-xs">/100</span>
                            </div>
                        </div>

                        {/* Communication */}
                        <div className="glass-card p-5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] mb-1 font-semibold">Communication</p>
                                <p className="text-[var(--text-muted)] text-xs">Code clarity, comments, and structure.</p>
                            </div>
                            <div className="text-right">
                                <span className="text-3xl font-black text-[var(--accent-secondary)]">{report?.communicationScore}</span>
                                <span className="text-[var(--text-muted)] text-xs">/100</span>
                            </div>
                        </div>

                        {/* Problem Solving */}
                        <div className="glass-card p-5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] mb-1 font-semibold">Problem Solving</p>
                                <p className="text-[var(--text-muted)] text-xs">Trial efficiency, execution speed, and independence.</p>
                            </div>
                            <div className="text-right">
                                <span className="text-3xl font-black text-[var(--warning)]">{report?.problemSolvingScore}</span>
                                <span className="text-[var(--text-muted)] text-xs">/100</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Approach ────────────────────────────────────────────── */}
                <div className="glass-card p-7 mb-5">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] mb-3 font-semibold">Approach</p>
                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{safeStr(report?.approach)}</p>
                </div>

                {/* ─── Strengths & Weaknesses ───────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    {/* Strengths */}
                    <div className="glass-card p-6 border-green-500/10 bg-green-500/[0.02]">
                        <p className="text-[10px] text-green-400 uppercase tracking-[0.15em] mb-3 font-semibold flex items-center gap-1.5">
                            <span>✅</span> Key Strengths
                        </p>
                        {report?.strengths && report.strengths.length > 0 ? (
                            <ul className="space-y-2">
                                {report.strengths.map((s, i) => (
                                    <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-2">
                                        <span className="text-green-400 shrink-0">•</span>
                                        <span>{s}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-[var(--text-muted)]">No explicit strengths captured.</p>
                        )}
                    </div>

                    {/* Weaknesses */}
                    <div className="glass-card p-6 border-red-500/10 bg-red-500/[0.02]">
                        <p className="text-[10px] text-red-400 uppercase tracking-[0.15em] mb-3 font-semibold flex items-center gap-1.5">
                            <span>⚠️</span> Areas for Growth
                        </p>
                        {report?.weaknesses && report.weaknesses.length > 0 ? (
                            <ul className="space-y-2">
                                {report.weaknesses.map((w, i) => (
                                    <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-2">
                                        <span className="text-red-400 shrink-0">•</span>
                                        <span>{w}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-[var(--text-muted)]">No critical weaknesses identified.</p>
                        )}
                    </div>
                </div>

                {/* ─── Tips ───────────────────────────────────────────────── */}
                <div className="glass-card p-7 mb-10">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] mb-3 font-semibold">Improvement Tips</p>
                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-wrap">{safeStr(report?.tips)}</p>
                </div>

                {/* ─── Actions ────────────────────────────────────────────── */}
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="btn btn-primary btn-md"
                    >
                        Back to Dashboard
                    </button>
                    <button
                        onClick={() => navigate(`/replay/${id}`)}
                        className="btn btn-secondary btn-md"
                    >
                        ▶ Watch Replay
                    </button>
                    <button
                        onClick={() => navigate("/mock")}
                        className="btn btn-secondary btn-md"
                    >
                        Practice Again →
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Report;