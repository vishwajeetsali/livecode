import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import type { Report as IReport } from "../types";
import { safeStr } from "../utils/helper";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

const Report = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [report, setReport] = useState<IReport | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            const res = await api.get(`/reports/${id}`);
            setReport(res.data);
            setLoading(false);
        };
        fetchReport();
    }, [id]);

    const chartData = report ? [
        { subject: "Coding Logic", score: report.codeScore || 0, fullMark: 100 },
        { subject: "Communication", score: report.communicationScore || 0, fullMark: 100 },
        { subject: "Problem Solving", score: report.problemSolvingScore || 0, fullMark: 100 },
    ] : [];

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
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                                    <PolarGrid stroke="rgba(255,255,255,0.05)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#475569" }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)", borderRadius: "12px", fontSize: "12px" }}
                                        itemStyle={{ color: "var(--accent)" }}
                                    />
                                    <Radar name="Performance" dataKey="score" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.15} />
                                </RadarChart>
                            </ResponsiveContainer>
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