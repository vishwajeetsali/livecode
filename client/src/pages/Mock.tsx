import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import api from "../utils/api";
import { LANGUAGES, langMap, getSupportedMimeType, formatTime, safeStr } from "../utils/helper";
import Navbar from "../components/Navbar";
import toast from "react-hot-toast";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface Question {
    title: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    description: string;
    examples: { input: string; output: string }[];
    constraints: string[];
}

const difficultyColor: Record<string, string> = {
    EASY: "text-green-400 border-green-400/30 bg-green-400/10",
    MEDIUM: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
    HARD: "text-red-400 border-red-400/30 bg-red-400/10",
};


const Mock = () => {
    const navigate = useNavigate();


    const [question, setQuestion] = useState<Question | null>(null);
    const [code, setCode] = useState("// Start coding here...");
    const [output, setOutput] = useState("");
    const [hint, setHint] = useState("");
    const [loadingHint, setLoadingHint] = useState(false);
    const [loadingQuestion, setLoadingQuestion] = useState(true);
    const [loadingRun, setLoadingRun] = useState(false);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [sessionId, setSessionId] = useState("");
    const [roomId, setRoomId] = useState("");
    const [elapsed, setElapsed] = useState(0);
    const [language, setLanguage] = useState("javascript");
    const [langId, setLangId] = useState(63);
    const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
    const [role, setRole] = useState("sde");
    const [customRole, setCustomRole] = useState("");
    const [timeLimit, setTimeLimit] = useState<number>(45); // in minutes, 0 = unlimited
    const [started, setStarted] = useState(false);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const mimeTypeRef = useRef<string>("audio/webm");

    // ── Resize state (window-level listeners, same as Room.tsx) ──
    const [problemWidth, setProblemWidth] = useState(384);
    const [consoleHeight, setConsoleHeight] = useState(128);
    const activeResizeRef = useRef<"problem" | "console" | null>(null);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!activeResizeRef.current) return;
            if (activeResizeRef.current === "problem") {
                const w = Math.max(200, Math.min(600, e.clientX));
                setProblemWidth(w);
            } else if (activeResizeRef.current === "console") {
                const panel = document.getElementById("mock-editor-panel");
                if (!panel) return;
                const rect = panel.getBoundingClientRect();
                const h = Math.max(60, Math.min(400, rect.bottom - e.clientY));
                setConsoleHeight(h);
            }
        };
        const onUp = () => { activeResizeRef.current = null; };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, []);

    const initMock = async (diff: string) => {
        try {
            setLoadingQuestion(true);
            const resolvedRole = role === "custom" ? (customRole.trim() || "sde") : role;
            const [sessionRes, questionRes] = await Promise.all([
                api.post("/mock/start"),
                api.post("/mock/question", { difficulty: diff, role: resolvedRole }),
            ]);
            setRoomId(sessionRes.data.roomId);
            setSessionId(sessionRes.data.sessionId);
            setQuestion(questionRes.data);
        } catch {
            toast.error("Failed to load question. Please refresh.");
        } finally {
            setLoadingQuestion(false);
        }
    };

    // useEffect stays but calls with difficulty:
    useEffect(() => {
        if (!started) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        initMock(difficulty);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [started]);

    useEffect(() => {
        if (!started) return;
        const startMic = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mimeType = getSupportedMimeType();
                mimeTypeRef.current = mimeType || "audio/webm";
                const recorder = mimeType
                    ? new MediaRecorder(stream, { mimeType })
                    : new MediaRecorder(stream);
                recorderRef.current = recorder;
                recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
                recorder.start();
            } catch {
                toast.error("Microphone unavailable. Continuing without audio analysis.");
            }
        };
        startMic();
    }, [started]);

    useEffect(() => {
        if (!started) return;
        const timer = setInterval(() => setElapsed(e => e + 1), 1000);
        return () => clearInterval(timer);
    }, [started]);

    const [stdin, setStdin] = useState("");
    const [consoleTab, setConsoleTab] = useState<"output" | "stdin">("output");
    const [hintCount, setHintCount] = useState(0);
    const [runCount, setRunCount] = useState(0);

    const handleRun = async () => {
        try {
            setLoadingRun(true);
            setRunCount((prev) => prev + 1);
            const res = await api.post("/code/execute", { code, languageId: langId, stdin });
            setOutput(res.data.output || "No output");
            setConsoleTab("output");
        } catch {
            toast.error("Code execution failed.");
        } finally {
            setLoadingRun(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                handleRun();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    });

    const handleGetHint = async () => {
        try {
            setLoadingHint(true);
            setHintCount((prev) => prev + 1);
            setHint("");
            const response = await fetch(`${BASE}/api/ai/hint`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
                body: JSON.stringify({ code, problem: question?.title }),
            });

            if (!response.ok) { toast.error("Failed to get hint."); setLoadingHint(false); return; }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) return;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                for (const line of chunk.split("\n\n")) {
                    if (line.startsWith("data: ")) {
                        const text = line.replace("data: ", "");
                        if (text === "[DONE]") { setLoadingHint(false); return; }
                        setHint(prev => prev + text);
                    }
                }
            }
        } catch {
            toast.error("Hint stream failed.");
            setLoadingHint(false);
        }
    };

    const handleSubmit = async () => {
        try {
            setLoadingSubmit(true);

            let transcript = "";
            let fillerCount = 0;

            if (recorderRef.current && recorderRef.current.state !== "inactive") {
                const stopped = new Promise<void>((resolve) => {
                    recorderRef.current!.onstop = () => resolve();
                });
                recorderRef.current.stop();
                recorderRef.current.stream.getTracks().forEach(t => t.stop());
                await stopped;

                const audioBlob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
                const formData = new FormData();
                const ext = mimeTypeRef.current.includes("mp4") ? "mp4" : mimeTypeRef.current.includes("ogg") ? "ogg" : "webm";
                formData.append("audio", audioBlob, `audio.${ext}`);

                try {
                    const transcribeRes = await api.post("/transcribe", formData, {
                        headers: { "Content-Type": "multipart/form-data" },
                    });
                    transcript = transcribeRes.data.transcript;
                    fillerCount = transcribeRes.data.fillerCount;
                } catch {
                    toast.error("Transcription failed, continuing without it.");
                }
            }

            await api.post("/rooms/end", { roomId });
            await api.post("/reports/generate", {
                sessionId,
                code,
                problem: question?.title,
                transcript,
                fillerCount,
                elapsed,
                hintCount,
                runCount,
                timeLimit,
            });
            toast.success("Report generated!");
            navigate(`/report/${sessionId}`);
        } catch {
            toast.error("Submission failed. Try again.");
            setLoadingSubmit(false);
        }
    };

    // Auto-submit when countdown hits zero
    useEffect(() => {
        if (!started || timeLimit === 0 || loadingSubmit) return;
        const remaining = timeLimit * 60 - elapsed;
        if (remaining <= 0) {
            toast.error("⏱️ Time's up! Auto-submitting session...", { duration: 5000 });
            handleSubmit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [started, elapsed, timeLimit]);

    const ROLE_CARDS = [
        {
            key: "sde",
            icon: "💻",
            label: "SDE / Full-Stack",
            desc: "Arrays, strings, trees, graphs, dynamic programming",
        },
        {
            key: "backend",
            icon: "🔧",
            label: "Backend & Systems",
            desc: "Caching, queues, rate limiting, data pipelines",
        },
        {
            key: "data",
            icon: "📊",
            label: "Data & Analytics",
            desc: "Frequency maps, aggregation, matrix ops, parsing",
        },
        {
            key: "custom",
            icon: "✏️",
            label: "Custom Domain",
            desc: "Type any role or domain below",
        },
    ];

    const INTENSITIES = [
        { key: "EASY" as const, label: "Practice", color: "text-green-400 border-green-400 bg-green-400/10" },
        { key: "MEDIUM" as const, label: "Real Interview", color: "text-blue-400 border-blue-400 bg-blue-400/10" },
    ];

    if (!started) return (
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
                    onClick={() => setStarted(true)}
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

    if (loadingQuestion) return (
        <div className="min-h-screen bg-[var(--bg-deep)] text-white flex items-center justify-center">
            <p className="text-gray-500">Generating question...</p>
        </div>
    );

    // Calculate countdown or stopwatch display
    const remainingSeconds = timeLimit > 0 ? Math.max(0, timeLimit * 60 - elapsed) : 0;
    const isWarningAmber = timeLimit > 0 && remainingSeconds <= 300 && remainingSeconds > 60;
    const isWarningRed = timeLimit > 0 && remainingSeconds <= 60;

    return (
        <div className="h-screen bg-[var(--bg-deep)] text-white flex flex-col overflow-hidden animate-page-fade">
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="btn btn-secondary btn-sm"
                    >
                        ← Dashboard
                    </button>
                    <span className="text-[var(--accent)] font-bold">LiveCode <span className="text-gray-500 font-normal text-sm">/ Mock Interview</span></span>
                </div>
                <div className="flex items-center gap-2">
                    {timeLimit > 0 ? (
                        <span className={`font-mono text-sm font-semibold transition-all ${
                            isWarningRed
                                ? "text-red-400 animate-pulse bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-lg"
                                : isWarningAmber
                                    ? "text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-lg"
                                    : "text-[var(--text-secondary)]"
                        }`}>
                            ⏱ {formatTime(remainingSeconds)} left
                        </span>
                    ) : (
                        <span className="font-mono text-[var(--text-secondary)] text-sm">⏱ {formatTime(elapsed)}</span>
                    )}
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={loadingSubmit}
                    className="btn btn-primary btn-sm"
                >
                    {loadingSubmit ? "Submitting..." : "Submit →"}
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden" style={{ userSelect: "none" }}>
                {/* Left: Problem panel */}
                <div style={{ width: `${problemWidth}px` }} className="shrink-0 border-r border-white/[0.06] overflow-y-auto p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-black">{safeStr(question?.title)}</h2>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${difficultyColor[question?.difficulty ?? "Medium"]}`}>
                            {safeStr(question?.difficulty)}
                        </span>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed">{safeStr(question?.description)}</p>

                    {question?.examples?.map((ex, i) => (
                        <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                            <p className="text-xs text-gray-500 mb-2">Example {i + 1}</p>
                            <p className="text-xs font-mono text-gray-300">Input: {safeStr(ex.input)}</p>
                            <p className="text-xs font-mono text-gray-300">Output: {safeStr(ex.output)}</p>
                        </div>
                    ))}

                    {(question?.constraints?.length ?? 0) > 0 && (
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Constraints</p>
                            {question!.constraints.map((c, i) => (
                                <p key={i} className="text-xs text-gray-400 font-mono">• {safeStr(c)}</p>
                            ))}
                        </div>
                    )}

                    <div className="mt-auto pt-4 border-t border-white/[0.06]">
                        <button
                            onClick={handleGetHint}
                            disabled={loadingHint}
                            className="w-full border border-green-400/30 text-green-400 py-2 rounded-xl text-sm font-semibold hover:bg-green-400/10 transition mb-3 disabled:opacity-50"
                        >
                            {loadingHint ? "Thinking..." : "🤖 Get Hint"}
                        </button>
                        {hint && <p className="text-gray-300 text-xs whitespace-pre-wrap">{hint}</p>}
                    </div>
                </div>

                {/* Resize divider */}
                <div
                    onMouseDown={(e) => { e.preventDefault(); activeResizeRef.current = "problem"; }}
                    className="w-1 hover:w-1.5 bg-white/5 hover:bg-green-400 cursor-col-resize transition-colors select-none self-stretch shrink-0"
                />

                {/* Right: Editor + Console */}
                <div id="mock-editor-panel" className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
                        <select
                            value={language}
                            onChange={(e) => {
                                setLanguage(e.target.value);
                                setLangId(langMap[e.target.value]);
                            }}
                            className="bg-[var(--bg-interactive)] border border-white/[0.08] text-[var(--text-primary)] text-xs rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:border-white/20 transition font-medium"
                        >
                            {LANGUAGES.map((l) => (
                                <option key={l.value} value={l.value} className="bg-[#0c0d14] text-white">
                                    {l.label}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handleRun}
                            disabled={loadingRun}
                            className="ml-auto bg-[var(--accent)] text-black text-sm font-bold px-4 py-1.5 rounded-lg hover:bg-[var(--accent-hover)] transition disabled:opacity-50"
                        >
                            {loadingRun ? "Running..." : "▶ Run"}
                        </button>
                    </div>
                    <div className="flex-1">
                        <Editor
                            value={code}
                            onChange={(val) => setCode(val || "")}
                            height="100%"
                            language={language}
                            theme="vs-dark"
                            options={{ fontSize: 14, minimap: { enabled: false }, padding: { top: 16 } }}
                        />
                    </div>

                    {/* Console resize handle */}
                    <div
                        onMouseDown={(e) => { e.preventDefault(); activeResizeRef.current = "console"; }}
                        className="h-1 hover:h-1.5 bg-white/5 hover:bg-green-400 cursor-row-resize transition-colors select-none w-full shrink-0"
                    />

                    <div style={{ height: `${consoleHeight}px` }} className="border-t border-white/[0.06] bg-black/40 px-4 py-3 shrink-0 overflow-y-auto flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setConsoleTab("output")}
                                    className={`text-xs uppercase tracking-widest font-semibold transition ${consoleTab === "output" ? "text-green-400 border-b border-green-400 pb-0.5" : "text-gray-600 hover:text-gray-400"}`}
                                >
                                    Output
                                </button>
                                <button
                                    onClick={() => setConsoleTab("stdin")}
                                    className={`text-xs uppercase tracking-widest font-semibold transition ${consoleTab === "stdin" ? "text-green-400 border-b border-green-400 pb-0.5" : "text-gray-600 hover:text-gray-400"}`}
                                >
                                    Input (STDIN)
                                </button>
                            </div>
                            <span className="text-[10px] text-gray-600 font-mono">Press Ctrl+Enter / ⌘+Enter to Run</span>
                        </div>
                        {consoleTab === "output" ? (
                            <p className="text-gray-400 font-mono text-sm whitespace-pre-wrap flex-1">{output || "Run your code to see output..."}</p>
                        ) : (
                            <textarea
                                value={stdin}
                                onChange={(e) => setStdin(e.target.value)}
                                placeholder="Enter program STDIN input here..."
                                className="w-full flex-1 bg-black/50 border border-white/[0.06] rounded-lg p-2 text-sm text-gray-300 font-mono outline-none focus:border-green-400/50 resize-none"
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Mock;