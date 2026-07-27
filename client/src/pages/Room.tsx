import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { useRef, useEffect, useState } from "react";
import socket from "../utils/socket";
import api from "../utils/api";
import { useSelector } from "react-redux";
import type { RootState } from "../app/store";
import { LANGUAGES, langMap, getSupportedMimeType, formatTime } from "../utils/helper.js";
import toast from "react-hot-toast";
import type { User, Problem } from "../types";
import type * as monaco from "monaco-editor";
import TopBar from "../components/room/TopBar";
import VideoPanel from "../components/room/VideoPanel";
import ChatPanel from "../components/room/ChatPanel";

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
    const user = useSelector((state: RootState) => state.auth.user);
    const isInterviewer = user?.role === "INTERVIEWER";

    // ─── Editor & Execution State ────────────────────────────────────────────
    const [code, setCode] = useState("// Start coding here...");
    const [output, setOutput] = useState("");
    const [langId, setLangId] = useState(63);
    const [language, setLanguage] = useState("javascript");
    const [loadingRun, setLoadingRun] = useState(false);
    const [loadingEnd, setLoadingEnd] = useState(false);
    const [stdin, setStdin] = useState("");
    const [consoleTab, setConsoleTab] = useState<"output" | "stdin">("output");

    // ─── Problem State ───────────────────────────────────────────────────────
    const [problem, setProblem] = useState("Two Sum");
    const [problems, setProblems] = useState<Problem[]>([]);
    const [showDescription, setShowDescription] = useState(true);
    const [showProblemPicker, setShowProblemPicker] = useState(false);
    const selectedProblem = problems.find((p) => p.title === problem) || null;

    // ─── Layout Resize State ─────────────────────────────────────────────────
    const [problemWidth, setProblemWidth] = useState(384);
    const [rightWidth, setRightWidth] = useState(300);
    const [consoleHeight, setConsoleHeight] = useState(128);
    const activeResizeRef = useRef<"problem" | "right" | "console" | null>(null);
    const problemWidthRef = useRef(384);
    const rightWidthRef = useRef(300);
    const consoleHeightRef = useRef(128);

    // ─── Room & Collaboration State ──────────────────────────────────────────
    const [roomValid, setRoomValid] = useState(true);
    const [elapsed, setElapsed] = useState(0);
    const [participants, setParticipants] = useState<User[]>([]);
    const [otherCursors, setOtherCursors] = useState<Record<string, CursorState>>({});
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [cameraAllowed, setCameraAllowed] = useState(true);

    // ─── Refs ────────────────────────────────────────────────────────────────
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monaco | null>(null);
    const decorationIdsRef = useRef<string[]>([]);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const mimeTypeRef = useRef<string>("audio/webm");
    const audioCtxRef = useRef<AudioContext | null>(null);
    const mixDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
    const remoteSourceAddedRef = useRef(false);

    // ─── Audio Recorder ──────────────────────────────────────────────────────
    const startMixedRecorder = () => {
        if (!isInterviewer || !mixDestRef.current) return;
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
            recorderRef.current.stop();
        }
        const mimeType = getSupportedMimeType();
        mimeTypeRef.current = mimeType || "audio/webm";
        const recorder = mimeType
            ? new MediaRecorder(mixDestRef.current.stream, { mimeType })
            : new MediaRecorder(mixDestRef.current.stream);
        recorderRef.current = recorder;
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorder.start();
    };

    // ─── Resize Handlers ─────────────────────────────────────────────────────
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!activeResizeRef.current) return;
            if (activeResizeRef.current === "problem") {
                const w = Math.max(200, Math.min(600, e.clientX));
                problemWidthRef.current = w;
                setProblemWidth(w);
            } else if (activeResizeRef.current === "right") {
                const w = Math.max(200, Math.min(500, window.innerWidth - e.clientX));
                rightWidthRef.current = w;
                setRightWidth(w);
            } else if (activeResizeRef.current === "console") {
                const editorPanel = document.getElementById("editor-center-panel");
                if (!editorPanel) return;
                const rect = editorPanel.getBoundingClientRect();
                const h = Math.max(60, Math.min(450, rect.bottom - e.clientY));
                consoleHeightRef.current = h;
                setConsoleHeight(h);
            }
        };
        const onUp = () => { activeResizeRef.current = null; };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    }, []);

    // ─── Socket + Room Init ──────────────────────────────────────────────────
    useEffect(() => {
        const checkRoom = async () => {
            try {
                const res = await api.get(`/rooms/${id}`);
                setProblem(res.data.problem || "Two Sum");
            } catch { setRoomValid(false); }
        };
        const fetchProblems = async () => {
            try { const res = await api.get("/problems"); setProblems(res.data); }
            catch { toast.error("Failed to load problems."); }
        };

        checkRoom();
        fetchProblems();
        socket.emit("joinRoom", { roomId: id, user });

        socket.on("codeUpdate", (newCode: string) => setCode(newCode));
        socket.on("sessionEnded", () => navigate("/dashboard"));
        socket.on("languageChange", (lang: string) => { setLanguage(lang); setLangId(langMap[lang]); });
        socket.on("problemChange", (newProblem: string) => setProblem(newProblem));
        socket.on("presenceUpdate", (users: User[]) => {
            setParticipants(users);
            setOtherCursors((prev) => {
                const next = { ...prev };
                Object.keys(next).forEach((uid) => { if (!users.some((u) => u.id === uid)) delete next[uid]; });
                return next;
            });
        });
        socket.on("cursorUpdate", ({ user: cursorUser, position }: { user: User; position: { lineNumber: number; column: number } }) => {
            if (cursorUser.id !== user?.id) {
                setOtherCursors((prev) => ({ ...prev, [cursorUser.id]: { user: cursorUser, position } }));
            }
        });
        socket.on("receiveMessage", (msg: ChatMessage) => setMessages((prev) => [...prev, msg]));

        return () => {
            socket.off("codeUpdate"); socket.off("sessionEnded"); socket.off("languageChange");
            socket.off("problemChange"); socket.off("presenceUpdate"); socket.off("cursorUpdate"); socket.off("receiveMessage");
        };
    }, [id, navigate, user]);

    // ─── WebRTC ──────────────────────────────────────────────────────────────
    useEffect(() => {
        const startVideo = async () => {
            try {
                let stream: MediaStream;
                try { stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); }
                catch { stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true }); setCameraAllowed(false); }

                localStreamRef.current = stream;
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;

                const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
                peerRef.current = peer;
                stream.getTracks().forEach(track => peer.addTrack(track, stream));

                if (isInterviewer) {
                    const audioCtx = new AudioContext();
                    audioCtxRef.current = audioCtx;
                    const mixDest = audioCtx.createMediaStreamDestination();
                    mixDestRef.current = mixDest;
                    const localAudioOnly = new MediaStream(stream.getAudioTracks());
                    audioCtx.createMediaStreamSource(localAudioOnly).connect(mixDest);
                    startMixedRecorder();
                }

                peer.ontrack = (e) => {
                    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
                    if (isInterviewer && audioCtxRef.current && mixDestRef.current && !remoteSourceAddedRef.current) {
                        const remoteAudioTracks = e.streams[0].getAudioTracks();
                        if (remoteAudioTracks.length > 0) {
                            remoteSourceAddedRef.current = true;
                            const remoteAudioOnly = new MediaStream(remoteAudioTracks);
                            audioCtxRef.current.createMediaStreamSource(remoteAudioOnly).connect(mixDestRef.current);
                        }
                    }
                };

                peer.onicecandidate = (e) => { if (e.candidate) socket.emit("iceCandidate", { roomId: id, candidate: e.candidate }); };

                if (isInterviewer) {
                    socket.on("candidateReady", async () => {
                        const offer = await peer.createOffer();
                        await peer.setLocalDescription(offer);
                        socket.emit("offer", { roomId: id, offer });
                    });
                } else {
                    socket.emit("candidateReady", { roomId: id });
                }

                socket.on("offer", async (offer) => { await peer.setRemoteDescription(offer); const answer = await peer.createAnswer(); await peer.setLocalDescription(answer); socket.emit("answer", { roomId: id, answer }); });
                socket.on("answer", async (answer) => { await peer.setRemoteDescription(answer); });
                socket.on("iceCandidate", async (candidate) => { await peer.addIceCandidate(candidate); });
            } catch (err) {
                setCameraAllowed(false);
                toast.error("Camera/microphone unavailable.");
                console.warn("Camera unavailable:", err);
            }
        };
        startVideo();
        return () => {
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            peerRef.current?.close();
            if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
            audioCtxRef.current?.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInterviewer, id]);

    // ─── Timer ───────────────────────────────────────────────────────────────
    useEffect(() => {
        const timer = setInterval(() => setElapsed(e => e + 1), 1000);
        return () => clearInterval(timer);
    }, []);

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
        decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, decorations);
    }, [otherCursors]);

    const [runCount, setRunCount] = useState(0);

    // ─── Handlers ────────────────────────────────────────────────────────────
    const handleRun = async () => {
        try {
            setLoadingRun(true);
            setRunCount((prev) => prev + 1);
            const res = await api.post("/code/execute", { code, languageId: langId, stdin });
            setOutput(res.data.output || "No output");
            setConsoleTab("output");
        } catch { toast.error("Code execution failed."); }
        finally { setLoadingRun(false); }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleRun(); }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    });

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
        try {
            setProblem(p); setShowProblemPicker(false);
            await api.post("/rooms/problem", { roomId: id, problem: p });
            socket.emit("problemChange", { roomId: id, problem: p });
            toast.success(`Problem set: ${p}`);
        } catch { toast.error("Failed to set problem."); }
    };

    const handleEndSession = async () => {
        if (!isInterviewer) return;
        if (!confirm("Are you sure you want to end this interview session? A final performance report will be generated.")) return;
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
                    console.warn("Transcription skipped:", e);
                }
            }

            const res = await api.post("/rooms/end", { roomId: id });
            const sessionId = res.data.sessionId;
            socket.emit("sessionEnded", { roomId: id });

            try {
                await api.post("/reports/generate", { sessionId, code, problem, transcript, fillerCount, elapsed, runCount });
                toast.success("Session ended. Report generated!");
            } catch (err) {
                console.error("Report generation failed:", err);
                toast.error("Session ended, but report generation had an issue.");
            }

            navigate(`/report/${sessionId}`);
        } catch (err) {
            console.error("End session error:", err);
            toast.error("Failed to end session. Please try again.");
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
                    <div
                        style={{ width: `${problemWidth}px` }}
                        className="border-r border-white/[0.06] overflow-y-auto p-5 flex flex-col gap-4 bg-[var(--bg-surface)] shrink-0"
                    >
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-lg font-bold text-white">{selectedProblem.title}</h2>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                                selectedProblem.difficulty === "EASY" ? "text-green-400 border-green-400/20 bg-green-400/5"
                                : selectedProblem.difficulty === "MEDIUM" ? "text-yellow-400 border-yellow-400/20 bg-yellow-400/5"
                                : "text-red-400 border-red-400/20 bg-red-400/5"
                            }`}>
                                {selectedProblem.difficulty}
                            </span>
                        </div>
                        <p className="text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-wrap">{selectedProblem.description}</p>

                        {selectedProblem.examples && Array.isArray(selectedProblem.examples) && selectedProblem.examples.map((ex: { input: string; output: string }, i: number) => (
                            <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
                                <p className="text-[10px] text-[var(--text-muted)] mb-2 font-semibold uppercase tracking-wider">Example {i + 1}</p>
                                <p className="text-xs font-mono text-[var(--text-secondary)]">Input: {ex.input}</p>
                                <p className="text-xs font-mono text-[var(--text-secondary)] mt-1">Output: {ex.output}</p>
                            </div>
                        ))}

                        {selectedProblem.constraints && selectedProblem.constraints.length > 0 && (
                            <div className="mt-1">
                                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.15em] mb-2 font-semibold">Constraints</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    {selectedProblem.constraints.map((c: string, i: number) => (
                                        <li key={i} className="text-xs text-[var(--text-muted)] font-mono">{c}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Problem resize handle */}
                {showDescription && selectedProblem && (
                    <div
                        onMouseDown={(e) => { e.preventDefault(); activeResizeRef.current = "problem"; }}
                        className="w-1 hover:w-1.5 bg-white/[0.03] hover:bg-[var(--accent)] cursor-col-resize transition-colors select-none self-stretch shrink-0 z-40"
                    />
                )}

                {/* ─── Editor Center ──────────────────────────────────────── */}
                <div id="editor-center-panel" className="flex flex-col flex-1 min-w-0">
                    {/* Editor toolbar */}
                    <div className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.06] bg-[var(--bg-surface)]">
                        <select
                            value={language}
                            onChange={(e) => {
                                const lang = e.target.value;
                                setLanguage(lang); setLangId(langMap[lang]);
                                socket.emit("languageChange", { roomId: id, language: lang });
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
                            className="ml-auto btn btn-primary btn-sm"
                        >
                            {loadingRun ? "Running..." : "▶ Run"}
                        </button>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1">
                        <Editor
                            value={code}
                            onChange={(val) => { setCode(val || ""); socket.emit("codeChange", { roomId: id, code: val }); }}
                            onMount={(editor, monacoInstance) => {
                                editorRef.current = editor;
                                monacoRef.current = monacoInstance;
                                editor.onDidChangeCursorPosition((e) => {
                                    socket.emit("cursorMove", { roomId: id, user, position: e.position });
                                });
                            }}
                            height="100%"
                            language={language}
                            defaultValue="// Start coding here..."
                            theme="vs-dark"
                            options={{ fontSize: 13, minimap: { enabled: false }, padding: { top: 12 }, automaticLayout: true, fontFamily: "var(--font-mono)" }}
                        />
                    </div>

                    {/* Console resize handle */}
                    <div
                        onMouseDown={(e) => { e.preventDefault(); activeResizeRef.current = "console"; }}
                        className="h-0.5 hover:h-1 bg-white/[0.04] hover:bg-[var(--accent)] cursor-row-resize transition-colors select-none w-full shrink-0 z-40"
                    />

                    {/* Console */}
                    <div
                        style={{ height: `${consoleHeight}px` }}
                        className="border-t border-white/[0.06] bg-[var(--bg-surface)] px-4 py-2.5 shrink-0 overflow-y-auto flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setConsoleTab("output")}
                                    className={`text-[10px] uppercase tracking-[0.15em] font-semibold transition ${consoleTab === "output" ? "text-[var(--accent)] border-b border-[var(--accent)] pb-0.5" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}
                                >Output</button>
                                <button
                                    onClick={() => setConsoleTab("stdin")}
                                    className={`text-[10px] uppercase tracking-[0.15em] font-semibold transition ${consoleTab === "stdin" ? "text-[var(--accent)] border-b border-[var(--accent)] pb-0.5" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}
                                >Input (STDIN)</button>
                            </div>
                            <span className="text-[9px] text-[var(--text-muted)] font-mono">Ctrl+Enter to Run</span>
                        </div>
                        {consoleTab === "output" ? (
                            <p className="text-[var(--text-secondary)] font-mono text-xs whitespace-pre-wrap flex-1">{output || "Run your code to see output..."}</p>
                        ) : (
                            <textarea
                                value={stdin}
                                onChange={(e) => setStdin(e.target.value)}
                                placeholder="Enter program STDIN input here..."
                                className="w-full flex-1 bg-black/20 border border-white/[0.06] rounded-lg p-2 text-xs text-[var(--text-secondary)] font-mono outline-none focus:border-[var(--accent)]/40 resize-none"
                            />
                        )}
                    </div>
                </div>

                {/* Right panel resize handle */}
                <div
                    onMouseDown={(e) => { e.preventDefault(); activeResizeRef.current = "right"; }}
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