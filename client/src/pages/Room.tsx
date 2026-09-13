import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { useRef, useEffect, useState, useCallback } from "react";
import socket from "../utils/socket";
import api from "../utils/api";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../app/store";
import { resetToBaseRole } from "../features/auth/authSlice";
import { LANGUAGES, langMap } from "../utils/helper.js";
import toast from "react-hot-toast";
import type { User, Problem } from "../types";
import type * as monaco from "monaco-editor";
import TopBar from "../components/room/TopBar";
import VideoPanel from "../components/room/VideoPanel";
import ChatPanel from "../components/room/ChatPanel";
import ProblemPanel from "../components/room/ProblemPanel";
import ConsolePanel from "../components/room/ConsolePanel";
import { useRoomSocket } from "../hooks/useRoomSocket";
import { useWebRTC } from "../hooks/useWebRTC";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useResizablePanels } from "../hooks/useResizablePanels";
import { useCodeExecution } from "../hooks/useCodeExecution";
import { useCodeReview } from "../hooks/useCodeReview";
import { useTimer } from "../hooks/useTimer";
import { getStarterCode, isStarterCode } from "../utils/starterCode";
import { useYjsCollaboration } from "../hooks/useYjsCollaboration";
import { useNotifications } from "../features/notifications";
import { useTheme } from "../features/theme";

interface CursorState {
    user: User;
    position: { lineNumber: number; column: number };
}

interface ChatMessage {
    senderId: string;
    senderName: string;
    senderAvatar?: string | null;
    text: string;
    timestamp: string;
}

const Room = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.auth.user);
    const isInterviewer = user?.role === "INTERVIEWER";

    useEffect(() => {
        return () => {
            dispatch(resetToBaseRole());
        };
    }, [dispatch]);

    // ─── Editor & Execution State ────────────────────────────────────────────
    const [langId, setLangId] = useState(63);
    const [language, setLanguage] = useState("javascript");
    const [loadingEnd, setLoadingEnd] = useState(false);
    const endingRef = useRef(false);
    const [stdin, setStdin] = useState("");
    const [consoleTab, setConsoleTab] = useState<"output" | "stdin">("output");
    const { output, testResults, loadingRun, runCount, executeCode } = useCodeExecution();
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monaco | null>(null);
    const { requestReview, clearReview, loading: loadingReview, hasReview } = useCodeReview(editorRef, monacoRef);
    const { bindEditor, getText, setText, synced } = useYjsCollaboration({ roomId: id });

    // ─── Problem State ───────────────────────────────────────────────────────
    const [problem, setProblem] = useState("Two Sum");
    const [problems, setProblems] = useState<Problem[]>([]);
    const [showDescription, setShowDescription] = useState(true);
    const [showProblemPicker, setShowProblemPicker] = useState(false);
    const selectedProblem = problems.find((p) => p.title === problem) || null;
    const activeProblemTitle = selectedProblem?.title || problem || "Two Sum";

    useEffect(() => {
        if (isInterviewer && activeProblemTitle && synced) {
            const currentVal = getText();
            if (!currentVal.trim()) {
                const starter = getStarterCode(activeProblemTitle, language);
                setText(starter);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInterviewer, activeProblemTitle, synced]);

    // ─── Layout Resize State ─────────────────────────────────────────────────
    const { problemWidth, rightWidth, consoleHeight, startResize } = useResizablePanels();

    // ─── Room & Collaboration State ──────────────────────────────────────────
    const [roomValid, setRoomValid] = useState(true);
    const [roomCreatedAt, setRoomCreatedAt] = useState<string | null>(null);
    const { elapsed } = useTimer(roomValid, roomCreatedAt);
    const [participants, setParticipants] = useState<User[]>([]);
    const [otherCursors, setOtherCursors] = useState<Record<string, CursorState>>({});
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");

    // Prevent accidental tab closure or navigation during live room
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (roomValid) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [roomValid]);

    // ─── Hooks ──────────────────────────────────────────────────────────────
    const { recorderRef, chunksRef, mimeTypeRef, startMixedRecorder, addRemoteStream } = useAudioRecorder("mixed", true);

    const { addNotification } = useNotifications();
    const { resolvedTheme } = useTheme();

    useRoomSocket({
        roomId: id, user, navigate, setProblem, setRoomValid, setProblems, setLanguage, setLangId, setParticipants, setOtherCursors, setMessages, addNotification, setRoomCreatedAt
    });

    const handleRemoteStream = useCallback((stream: MediaStream) => {
        if (isInterviewer) {
            addRemoteStream(stream);
        }
    }, [isInterviewer, addRemoteStream]);

    const handleLocalStream = useCallback((stream: MediaStream) => {
        if (isInterviewer) {
            startMixedRecorder(stream);
        }
    }, [isInterviewer, startMixedRecorder]);

    const { localVideoRef, remoteVideoRef, cameraAllowed, remoteConnected, remoteHasVideo } = useWebRTC({
        roomId: id,
        isInterviewer,
        socket,
        onLocalStream: handleLocalStream,
        onRemoteStream: handleRemoteStream
    });


    const decorationCollectionRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

    // ─── Remote Cursor Decorations ───────────────────────────────────────────
    useEffect(() => {
        if (!editorRef.current || !monacoRef.current) return;
        const editor = editorRef.current;
        const monacoInst = monacoRef.current;
        const decorations = Object.values(otherCursors).map(({ user: cursorUser, position }) => ({
            range: new monacoInst.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            options: {
                className: cursorUser.role === "INTERVIEWER" ? "remote-cursor-interviewer" : "remote-cursor-candidate",
                hoverMessage: { value: `${cursorUser.name || "Collaborator"} (${cursorUser.role})` },
            },
        }));
        if (!decorationCollectionRef.current) {
            decorationCollectionRef.current = editor.createDecorationsCollection(decorations);
        } else {
            decorationCollectionRef.current.set(decorations);
        }
    }, [otherCursors]);

    // ─── Handlers ────────────────────────────────────────────────────────────
    const handleRun = useCallback(async () => {
        const currentCode = getText();
        await executeCode(
            currentCode,
            langId,
            stdin,
            selectedProblem?.title || problem,
            selectedProblem?.examples || []
        );
        setConsoleTab("output");
    }, [getText, langId, stdin, selectedProblem, problem, executeCode]);

    const handleRunRef = useRef(handleRun);
    useEffect(() => { handleRunRef.current = handleRun; }, [handleRun]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleRunRef.current(); }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        const chatMsg: ChatMessage = {
            senderId: user?.id || "",
            senderName: user?.name || "Anonymous",
            senderAvatar: user?.avatar,
            text: newMessage,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        socket.emit("sendMessage", { roomId: id, message: chatMsg });
        setMessages((prev) => [...prev, chatMsg]);
        setNewMessage("");
    };

    const handleSelectProblem = async (p: string) => {
        const currentVal = getText();
        if (!isStarterCode(currentVal, problem)) {
            if (!window.confirm("Changing the problem will replace the current code. Continue?")) return;
        }
        try {
            setProblem(p); setShowProblemPicker(false);
            await api.post("/rooms/problem", { roomId: id, problem: p });
            socket.emit("problemChange", { roomId: id, problem: p });
            const starter = getStarterCode(p, language);
            setText(starter);
            toast.success(`Problem set: ${p}`);
        } catch { toast.error("Failed to set problem."); }
    };

    const handleEndSession = async () => {
        if (!isInterviewer || endingRef.current) return;
        if (!confirm("Are you sure you want to end this interview session? A final performance report will be generated.")) return;
        endingRef.current = true;
        try {
            setLoadingEnd(true);
            let transcript = "";
            let fillerCount = 0;

            if (recorderRef.current && recorderRef.current.state !== "inactive") {
                try {
                    const stopped = new Promise<void>((resolve) => { recorderRef.current!.onstop = () => resolve(); });
                    recorderRef.current.stop();
                    await stopped;
                    const audioBlob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
                    const formData = new FormData();
                    const ext = mimeTypeRef.current.includes("mp4") ? "mp4" : mimeTypeRef.current.includes("ogg") ? "ogg" : "webm";
                    formData.append("audio", audioBlob, `audio.${ext}`);
                    const transcribeRes = await api.post("/transcribe", formData, { headers: { "Content-Type": "multipart/form-data" } });
                    transcript = transcribeRes.data.transcript;
                    fillerCount = transcribeRes.data.fillerCount;
                } catch (e) {
                    if (import.meta.env.DEV) console.warn("Transcription skipped:", e);
                }
            }

            const res = await api.post("/rooms/end", { roomId: id });
            const sessionId = res.data.sessionId;
            socket.emit("sessionEnded", { roomId: id });

            try {
                await api.post("/reports/generate", { sessionId, code: getText(), problem, transcript, fillerCount, elapsed, runCount });
                toast.success("Session ended. Report generated!");
            } catch (err) {
                if (import.meta.env.DEV) console.error("Report generation failed:", err);
                toast.error("Session ended, but report generation had an issue.");
            }

            navigate(`/report/${sessionId}`);
        } catch (err) {
            endingRef.current = false;
            if (import.meta.env.DEV) console.error("End session error:", err);
            toast.error("Failed to end session. Please try again.");
        } finally {
            setLoadingEnd(false);
        }
    };

    // ─── Invalid Room ────────────────────────────────────────────────────────
    if (!roomValid) return (
        <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col items-center justify-center gap-3">
            <p className="text-xl font-black text-red-400">Room not found</p>
            <p className="text-[var(--text-muted)] text-sm">This room may have expired or never existed.</p>
            <button onClick={() => navigate("/dashboard")} className="mt-3 bg-white/[0.04] border border-white/[0.08] px-6 py-2 rounded-xl text-sm hover:bg-white/[0.08] transition">← Back to Dashboard</button>
        </div>
    );

    // ─── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="h-screen bg-[var(--bg-deep)] text-white flex flex-col overflow-hidden animate-page-fade" style={{ userSelect: "none" }}>

            <TopBar
                id={id} elapsed={elapsed} problem={problem} problems={problems}
                participants={participants} user={user} isInterviewer={isInterviewer}
                showProblemPicker={showProblemPicker} setShowProblemPicker={setShowProblemPicker}
                showDescription={showDescription} setShowDescription={setShowDescription}
                selectedProblem={selectedProblem} loadingEnd={loadingEnd}
                onSelectProblem={handleSelectProblem} onEndSession={handleEndSession}
            />

            <div className="flex flex-1 overflow-hidden">

                {/* ─── Problem Panel ──────────────────────────────────────── */}
                {showDescription && selectedProblem && (
                    <>
                        <ProblemPanel problem={selectedProblem} width={problemWidth} />
                        <div
                            onMouseDown={startResize("problem")}
                            className="w-1 hover:w-1.5 bg-white/[0.03] hover:bg-[var(--accent)] cursor-col-resize transition-colors select-none self-stretch shrink-0 z-40"
                        />
                    </>
                )}

                {/* ─── Editor Center ──────────────────────────────────────── */}
                <div id="editor-center-panel" className="flex flex-col flex-1 min-w-0">
                    {/* Editor toolbar */}
                    <div className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.06] bg-[var(--bg-surface)]">
                        <select
                            value={language}
                            disabled={!isInterviewer}
                            onChange={(e) => {
                                const lang = e.target.value;
                                setLanguage(lang); setLangId(langMap[lang]);
                                socket.emit("languageChange", { roomId: id, language: lang });
                                const currentVal = getText();
                                if (isStarterCode(currentVal, activeProblemTitle)) {
                                    const starter = getStarterCode(activeProblemTitle, lang);
                                    setText(starter);
                                }
                            }}
                            className="bg-[var(--bg-interactive)] border border-white/[0.08] text-[var(--text-primary)] text-xs rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:border-white/20 transition font-medium disabled:opacity-75 disabled:cursor-not-allowed"
                            title={!isInterviewer ? "Only interviewer can change editor language" : "Change editor language"}
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
                            className="ml-auto btn btn-primary btn-sm"
                        >
                            {loadingRun ? "Running..." : "▶ Run"}
                        </button>
                        <button
                            onClick={() => hasReview ? clearReview() : requestReview(getText(), problem, language)}
                            disabled={loadingReview}
                            className={`btn btn-sm ${hasReview ? "btn-secondary" : "bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/30"} transition`}
                        >
                            {loadingReview ? "Reviewing..." : hasReview ? "✕ Clear Review" : "🔍 AI Review"}
                        </button>
                    </div>

                    {/* Monaco Editor — Yjs-managed, uncontrolled */}
                    <div className="flex-1">
                        <Editor
                            onMount={(editor, monacoInstance) => {
                                editorRef.current = editor;
                                monacoRef.current = monacoInstance;
                                bindEditor(editor);
                                editor.onDidChangeCursorPosition((e) => {
                                    socket.emit("cursorMove", { roomId: id, user, position: e.position });
                                });
                                // Debounced replay snapshots
                                let replayTimer: ReturnType<typeof setTimeout>;
                                editor.onDidChangeModelContent(() => {
                                    clearTimeout(replayTimer);
                                    replayTimer = setTimeout(() => {
                                        socket.emit("codeChange", { roomId: id, code: getText() });
                                    }, 2000);
                                });
                            }}
                            height="100%"
                            language={language}
                            defaultValue=""
                            theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
                            options={{ fontSize: 13, minimap: { enabled: false }, padding: { top: 12 }, automaticLayout: true, fontFamily: "var(--font-mono)", glyphMargin: true }}
                        />
                    </div>

                    {/* Console resize handle */}
                    <div
                        onMouseDown={startResize("console")}
                        className="h-0.5 hover:h-1 bg-white/[0.04] hover:bg-[var(--accent)] cursor-row-resize transition-colors select-none w-full shrink-0 z-40"
                    />

                    {/* Console */}
                    <ConsolePanel
                        height={consoleHeight}
                        consoleTab={consoleTab}
                        setConsoleTab={setConsoleTab}
                        output={output}
                        testResults={testResults}
                        stdin={stdin}
                        setStdin={setStdin}
                    />
                </div>

                {/* Right panel resize handle */}
                <div
                    onMouseDown={startResize("right")}
                    className="w-1 hover:w-1.5 bg-white/[0.03] hover:bg-[var(--accent)] cursor-col-resize transition-colors select-none self-stretch shrink-0 z-40"
                />

                {/* ─── Right Panel ────────────────────────────────────────── */}
                <div
                    style={{ width: `${rightWidth}px` }}
                    className="flex flex-col shrink-0 bg-[var(--bg-deep)] h-full overflow-hidden"
                >
                    <VideoPanel
                        localVideoRef={localVideoRef}
                        remoteVideoRef={remoteVideoRef}
                        cameraAllowed={cameraAllowed}
                        remoteConnected={remoteConnected}
                        remoteHasVideo={remoteHasVideo}
                    />
                    <ChatPanel
                        messages={messages}
                        newMessage={newMessage}
                        setNewMessage={setNewMessage}
                        onSendMessage={handleSendMessage}
                        user={user}
                    />
                </div>
            </div>
        </div>
    );
};

export default Room;