import { useMemo } from "react";
import type { Session } from "../../types";

interface AnalyticsPanelProps {
    sessions: Session[];
}

interface ScorePoint {
    date: string;
    code: number;
    communication: number;
    problemSolving: number;
    overall: number;
}

const AnalyticsPanel = ({ sessions }: AnalyticsPanelProps) => {
    const analytics = useMemo(() => {
        // Filter sessions that have reports with scores
        const scored = sessions
            .filter((s) => s.report && s.report.codeScore != null)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        if (scored.length === 0) return null;

        // Build data points
        const points: ScorePoint[] = scored.map((s) => {
            const r = s.report!;
            const code = r.codeScore ?? 0;
            const comm = r.communicationScore ?? 0;
            const ps = r.problemSolvingScore ?? 0;
            return {
                date: new Date(s.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                code,
                communication: comm,
                problemSolving: ps,
                overall: Math.round((code + comm + ps) / 3),
            };
        });

        // Averages
        const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
        const avgCode = avg(points.map((p) => p.code));
        const avgComm = avg(points.map((p) => p.communication));
        const avgPS = avg(points.map((p) => p.problemSolving));
        const avgOverall = avg(points.map((p) => p.overall));

        // Improvement: compare last 3 vs first 3
        const firstN = points.slice(0, Math.min(3, points.length));
        const lastN = points.slice(-Math.min(3, points.length));
        const firstAvg = avg(firstN.map((p) => p.overall));
        const lastAvg = avg(lastN.map((p) => p.overall));
        const improvement = lastAvg - firstAvg;

        // Best session
        const best = points.reduce((max, p) => (p.overall > max.overall ? p : max), points[0]);

        return { points, avgCode, avgComm, avgPS, avgOverall, improvement, best, totalScored: scored.length };
    }, [sessions]);

    if (!analytics || analytics.points.length === 0) {
        return (
            <div className="glass-card p-8 text-center">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-[var(--text-secondary)] font-semibold">No analytics yet</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                    Complete a mock interview to see your score trends and analytics.
                </p>
            </div>
        );
    }

    const { points, avgCode, avgComm, avgPS, avgOverall, improvement, best, totalScored } = analytics;

    return (
        <div className="space-y-6 animate-page-fade">
            {/* ─── Stat Cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Overall Avg" value={`${avgOverall}`} suffix="/100" color="var(--accent)" />
                <StatCard label="Sessions Scored" value={`${totalScored}`} suffix="" color="#6366f1" />
                <StatCard
                    label="Improvement"
                    value={`${improvement >= 0 ? "+" : ""}${improvement}`}
                    suffix="pts"
                    color={improvement >= 0 ? "#22c55e" : "#ef4444"}
                />
                <StatCard label="Best Score" value={`${best.overall}`} suffix={`on ${best.date}`} color="#eab308" />
            </div>

            {/* ─── Score Averages ──────────────────────────────────────────── */}
            <div className="glass-card p-6">
                <h3 className="text-xs uppercase tracking-[0.15em] text-[var(--text-muted)] font-semibold mb-4">
                    Average Scores
                </h3>
                <div className="grid grid-cols-3 gap-4">
                    <ScoreBar label="Code Quality" value={avgCode} color="#6366f1" />
                    <ScoreBar label="Communication" value={avgComm} color="#3b82f6" />
                    <ScoreBar label="Problem Solving" value={avgPS} color="#eab308" />
                </div>
            </div>

            {/* ─── Score Trend Chart ───────────────────────────────────────── */}
            {points.length >= 2 && (
                <div className="glass-card p-6">
                    <h3 className="text-xs uppercase tracking-[0.15em] text-[var(--text-muted)] font-semibold mb-4">
                        Score Trends
                    </h3>
                    <TrendChart points={points} />
                </div>
            )}
        </div>
    );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const StatCard = ({ label, value, suffix, color }: { label: string; value: string; suffix: string; color: string }) => (
    <div className="glass-card p-4">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-semibold mb-2">{label}</p>
        <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black" style={{ color }}>{value}</span>
            <span className="text-xs text-[var(--text-muted)]">{suffix}</span>
        </div>
    </div>
);

const ScoreBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div>
        <div className="flex justify-between text-xs mb-1.5">
            <span className="text-[var(--text-secondary)]">{label}</span>
            <span className="font-bold" style={{ color }}>{value}</span>
        </div>
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                    width: `${Math.min(100, value)}%`,
                    background: `linear-gradient(90deg, ${color}80, ${color})`,
                    boxShadow: `0 0 12px ${color}40`,
                }}
            />
        </div>
    </div>
);

const TrendChart = ({ points }: { points: ScorePoint[] }) => {
    const W = 600;
    const H = 200;
    const PAD = { top: 20, right: 20, bottom: 30, left: 35 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;

    const maxY = 100;
    const xStep = points.length > 1 ? chartW / (points.length - 1) : 0;

    const buildPath = (key: keyof ScorePoint) =>
        points
            .map((p, i) => {
                const x = PAD.left + i * xStep;
                const y = PAD.top + chartH - (Number(p[key]) / maxY) * chartH;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ");

    const lines = [
        { key: "code" as const, color: "#6366f1", label: "Code" },
        { key: "communication" as const, color: "#3b82f6", label: "Comm" },
        { key: "problemSolving" as const, color: "#eab308", label: "PS" },
        { key: "overall" as const, color: "#4ade80", label: "Overall" },
    ];

    // Y-axis grid lines
    const yTicks = [0, 25, 50, 75, 100];

    return (
        <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[400px]" preserveAspectRatio="xMidYMid meet">
                {/* Grid lines */}
                {yTicks.map((tick) => {
                    const y = PAD.top + chartH - (tick / maxY) * chartH;
                    return (
                        <g key={tick}>
                            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
                            <text x={PAD.left - 8} y={y + 4} fill="rgba(255,255,255,0.25)" fontSize="10" textAnchor="end">
                                {tick}
                            </text>
                        </g>
                    );
                })}

                {/* X-axis labels */}
                {points.map((p, i) => {
                    const x = PAD.left + i * xStep;
                    // Show every label if <= 8 points, else every other
                    if (points.length > 8 && i % 2 !== 0 && i !== points.length - 1) return null;
                    return (
                        <text key={i} x={x} y={H - 5} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="middle">
                            {p.date}
                        </text>
                    );
                })}

                {/* Lines */}
                {lines.map(({ key, color }) => (
                    <path key={key} d={buildPath(key)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={key === "overall" ? 1 : 0.5} />
                ))}

                {/* Dots for overall */}
                {points.map((p, i) => {
                    const x = PAD.left + i * xStep;
                    const y = PAD.top + chartH - (p.overall / maxY) * chartH;
                    return <circle key={i} cx={x} cy={y} r="3.5" fill="#4ade80" stroke="#0c0d14" strokeWidth="1.5" />;
                })}

                {/* Legend */}
                {lines.map(({ color, label }, i) => (
                    <g key={label} transform={`translate(${PAD.left + i * 80}, ${PAD.top - 10})`}>
                        <line x1="0" y1="0" x2="14" y2="0" stroke={color} strokeWidth="2" />
                        <text x="18" y="3.5" fill="rgba(255,255,255,0.5)" fontSize="9">{label}</text>
                    </g>
                ))}
            </svg>
        </div>
    );
};

export default AnalyticsPanel;
