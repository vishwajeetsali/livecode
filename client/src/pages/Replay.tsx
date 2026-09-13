import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import api from "../utils/api";
import { useReplayPlayer } from "../hooks/useReplayPlayer";
import type { ReplayEvent } from "../hooks/useReplayPlayer";
import Navbar from "../components/Navbar";
import { useTheme } from "../features/theme";

const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const SPEED_OPTIONS = [0.5, 1, 2, 4];

const Replay = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { resolvedTheme } = useTheme();

    const [events, setEvents] = useState<ReplayEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchReplay = async () => {
            try {
                const res = await api.get(`/replay/${id}`);
                setEvents(res.data.data || res.data);
            } catch {
                setError("Replay not found or you don't have access.");
            } finally {
                setLoading(false);
            }
        };
        fetchReplay();
    }, [id]);

    const {
        state,
        currentTime,
        duration,
        isPlaying,
        speed,
        progress,
        toggle,
        seekToProgress,
        setSpeed,
    } = useReplayPlayer(events);

    // ─── Loading State ───────────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col">
            <Navbar />
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-[var(--text-muted)] font-mono">Loading replay...</span>
                </div>
            </div>
        </div>
    );

    // ─── Error State ─────────────────────────────────────────────────────────
    if (error || events.length === 0) return (
        <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col">
            <Navbar />
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="text-5xl mb-2">🎬</div>
                <p className="text-lg font-bold text-[var(--text-secondary)]">
                    {error || "No replay data available for this session"}
                </p>
                <p className="text-sm text-[var(--text-muted)] max-w-md text-center">
                    Replay data is recorded during live and mock interview sessions. Try completing a session first.
                </p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-2 btn btn-secondary btn-md"
                >
                    ← Go Back
                </button>
            </div>
        </div>
    );

    // ─── Replay Player ───────────────────────────────────────────────────────
    return (
        <div className="h-screen bg-[var(--bg-deep)] text-white flex flex-col overflow-hidden animate-page-fade">

            {/* ─── Top Bar ────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-[var(--bg-surface)]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="btn btn-secondary btn-sm"
                    >
                        ← Back
                    </button>
                    <span className="text-[var(--accent)] font-bold">
                        LiveCode <span className="text-[var(--text-muted)] font-normal text-sm">/ Session Replay</span>
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-semibold">
                        Language
                    </span>
                    <span className="text-xs font-mono bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 rounded-lg text-[var(--text-secondary)]">
                        {state.language}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-semibold">
                        Events
                    </span>
                    <span className="text-xs font-mono text-[var(--text-secondary)]">
                        {events.length.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* ─── Editor ─────────────────────────────────────────────────── */}
            <div className="flex-1 relative">
                <Editor
                    value={state.code}
                    height="100%"
                    language={state.language}
                    theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
                    options={{
                        readOnly: true,
                        fontSize: 14,
                        minimap: { enabled: false },
                        padding: { top: 16 },
                        domReadOnly: true,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        fontFamily: "var(--font-mono)",
                    }}
                />

                {/* Playback status overlay */}
                {!isPlaying && currentTime === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                        <button
                            onClick={toggle}
                            className="flex flex-col items-center gap-3 group cursor-pointer"
                        >
                            <div className="w-20 h-20 rounded-full bg-[var(--accent)]/20 border-2 border-[var(--accent)]/50 flex items-center justify-center group-hover:bg-[var(--accent)]/30 transition-all duration-300 group-hover:scale-110">
                                <span className="text-3xl ml-1">▶</span>
                            </div>
                            <span className="text-sm font-semibold text-white/80">Play Replay</span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                                {formatTime(duration)} total · {events.length} events
                            </span>
                        </button>
                    </div>
                )}
            </div>

            {/* ─── Playback Controls ──────────────────────────────────────── */}
            <div className="border-t border-white/[0.06] bg-[var(--bg-surface)] px-6 py-4">

                {/* Timeline Slider */}
                <div className="mb-3 group">
                    <input
                        type="range"
                        min={0}
                        max={1000}
                        value={Math.round(progress * 1000)}
                        onChange={(e) => seekToProgress(Number(e.target.value) / 1000)}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/[0.08] accent-[var(--accent)] 
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)] 
                            [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(74,222,128,0.4)] [&::-webkit-slider-thumb]:transition-transform
                            [&::-webkit-slider-thumb]:hover:scale-125"
                        style={{
                            background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${progress * 100}%, rgba(255,255,255,0.08) ${progress * 100}%, rgba(255,255,255,0.08) 100%)`,
                        }}
                    />
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Play/Pause */}
                        <button
                            onClick={toggle}
                            className="w-10 h-10 rounded-full bg-[var(--accent)] text-black flex items-center justify-center hover:bg-[var(--accent-hover)] transition-all hover:scale-105 shadow-lg shadow-green-400/20"
                        >
                            <span className="text-lg font-bold">{isPlaying ? "⏸" : "▶"}</span>
                        </button>

                        {/* Time Display */}
                        <div className="flex items-center gap-1.5 font-mono text-sm">
                            <span className="text-white font-semibold">{formatTime(currentTime)}</span>
                            <span className="text-[var(--text-muted)]">/</span>
                            <span className="text-[var(--text-muted)]">{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Speed Controls */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-semibold mr-2">
                            Speed
                        </span>
                        {SPEED_OPTIONS.map((s) => (
                            <button
                                key={s}
                                onClick={() => setSpeed(s)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                    speed === s
                                        ? "bg-[var(--accent)] text-black shadow-md shadow-green-400/20"
                                        : "bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.06] hover:text-white hover:border-white/15"
                                }`}
                            >
                                {s}×
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Replay;
