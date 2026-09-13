import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import api from "../utils/api";
import { LANGUAGES, langMap, formatTime, safeStr } from "../utils/helper";
import toast from "react-hot-toast";
import { useResizablePanels } from "../hooks/useResizablePanels";
import { useCodeExecution } from "../hooks/useCodeExecution";
import { useCodeReview } from "../hooks/useCodeReview";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useTimer } from "../hooks/useTimer";
import { getStarterCode, isStarterCode } from "../utils/starterCode";
import { useTheme } from "../features/theme";
import TestResultsPanel from "../components/room/TestResultsPanel";
import MockSetupScreen from "../components/mock/MockSetupScreen";
import type * as monaco from "monaco-editor";

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
    const [hint, setHint] = useState("");
    const [loadingHint, setLoadingHint] = useState(false);
    const [loadingQuestion, setLoadingQuestion] = useState(true);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const submittingRef = useRef(false);
    const [sessionId, setSessionId] = useState("");
    const [roomId, setRoomId] = useState("");
    const [language, setLanguage] = useState("javascript");
    const [langId, setLangId] = useState(63);
    const [timeLimit] = useState<number>(45);
    const [started, setStarted] = useState(false);
    const { elapsed } = useTimer(started);
    const { resolvedTheme } = useTheme();
    const { recorderRef, chunksRef, mimeTypeRef } = useAudioRecorder("mic-only", started);
    const { problemWidth, consoleHeight, startResize } = useResizablePanels({ initialRightWidth: undefined });
    const { output, testResults, loadingRun, runCount, executeCode } = useCodeExecution();

    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monaco | null>(null);
    const { requestReview, clearReview, loading: loadingReview, hasReview } = useCodeReview(editorRef, monacoRef);

    const [stdin, setStdin] = useState("");
    const [consoleTab, setConsoleTab] = useState<"output" | "stdin">("output");
    const [hintCount, setHintCount] = useState(0);

    const initMock = async (diff: string, role: string) => {
        try {
            setLoadingQuestion(true);
            const [sessionRes, questionRes] = await Promise.all([
                api.post("/mock/start"),
                api.post("/mock/question", { difficulty: diff, role }),
            ]);
            setRoomId(sessionRes.data.roomId);
            setSessionId(sessionRes.data.sessionId);
            setQuestion(questionRes.data);
            if (questionRes.data?.title) {
                setCode(getStarterCode(questionRes.data.title, language));
            }
        } catch {
            toast.error("Failed to load question. Please refresh.");
        } finally {
            setLoadingQuestion(false);
        }
    };

    const handleLanguageChange = (newLang: string) => {
        setLanguage(newLang);
        setLangId(langMap[newLang]);
        if (question?.title) {
            if (isStarterCode(code, question.title)) {
                setCode(getStarterCode(question.title, newLang));
            }
        }
    };

    const handleRun = useCallback(async () => {
        await executeCode(code, langId, stdin, question?.title || "", question?.examples || []);
        setConsoleTab("output");
    }, [code, langId, stdin, question, executeCode]);

    const handleRunRef = useRef(handleRun);
    useEffect(() => { handleRunRef.current = handleRun; }, [handleRun]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                handleRunRef.current();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

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
                body: JSON.stringify({ code, problem: question?.title, isMock: true }),
            });

            if (!response.ok) { toast.error("Failed to get hint."); setLoadingHint(false); return; }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) return;

            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const frames = buffer.split("\n\n");
                // Retain the trailing incomplete chunk in buffer
                buffer = frames.pop() || "";

                for (const frame of frames) {
                    if (!frame.trim()) continue;
                    // SSE spec: multiple "data:" lines in one frame are joined with \n
                    const dataLines = frame.split("\n")
                        .filter(l => l.startsWith("data: "))
                        .map(l => l.slice(6));
                    if (dataLines.length === 0) continue;
                    const text = dataLines.join("\n");
                    if (text === "[DONE]") { setLoadingHint(false); return; }
                    setHint(prev => prev + text);
                }
            }

            if (buffer.trim()) {
                const dataLines = buffer.split("\n")
                    .filter(l => l.startsWith("data: "))
                    .map(l => l.slice(6));
                if (dataLines.length > 0) {
                    const text = dataLines.join("\n");
                    if (text !== "[DONE]") {
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
        if (submittingRef.current) return;
        submittingRef.current = true;
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
            submittingRef.current = false;
            setLoadingSubmit(false);
        }
    };

    // Auto-submit when countdown hits zero
    useEffect(() => {
        if (!started || timeLimit === 0 || loadingSubmit) return;
        const remaining = timeLimit * 60 - elapsed;
        if (remaining <= 0) {
            toast.error("⏱️ Time's up! Auto-submitting session...", { duration: 5000 });
            const timer = setTimeout(() => {
                handleSubmit();
            }, 0);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [started, elapsed, timeLimit, loadingSubmit]);

    // ─── Setup Screen ────────────────────────────────────────────────────────
    if (!started) {
        return (
            <MockSetupScreen
                onStart={(config) => {
                    setStarted(true);
                    initMock(config.difficulty, config.role);
                }}
            />
        );
    }

    // ─── Loading Screen ──────────────────────────────────────────────────────
    if (loadingQuestion) return (
        <div className="min-h-screen bg-[var(--bg-deep)] text-white flex items-center justify-center">
            <p className="text-gray-500">Generating question...</p>
        </div>
    );

    // ─── Interview Screen ────────────────────────────────────────────────────
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
                    onMouseDown={startResize("problem")}
                    className="w-1 hover:w-1.5 bg-white/5 hover:bg-green-400 cursor-col-resize transition-colors select-none self-stretch shrink-0"
                />

                {/* Right: Editor + Console */}
                <div id="mock-editor-panel" className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
                        <select
                            value={language}
                            onChange={(e) => handleLanguageChange(e.target.value)}
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
                        <button
                            onClick={() => hasReview ? clearReview() : requestReview(code, question?.title || "", language)}
                            disabled={loadingReview}
                            className={`text-sm font-bold px-4 py-1.5 rounded-lg transition disabled:opacity-50 ${hasReview ? "bg-white/[0.06] text-gray-300 hover:bg-white/[0.1]" : "bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/30"}`}
                        >
                            {loadingReview ? "Reviewing..." : hasReview ? "✕ Clear" : "🔍 Review"}
                        </button>
                    </div>
                    <div className="flex-1">
                        <Editor
                            value={code}
                            onChange={(val) => setCode(val || "")}
                            onMount={(editor, monacoInstance) => {
                                editorRef.current = editor;
                                monacoRef.current = monacoInstance;
                            }}
                            height="100%"
                            language={language}
                            theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
                            options={{ fontSize: 14, minimap: { enabled: false }, padding: { top: 16 }, glyphMargin: true }}
                        />
                    </div>

                    {/* Console resize handle */}
                    <div
                        onMouseDown={startResize("console")}
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
                            <TestResultsPanel testResults={testResults} rawOutput={output} />
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