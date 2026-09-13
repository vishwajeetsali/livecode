import { useEffect, useRef } from "react";
import socket from "../utils/socket";
import api from "../utils/api";
import toast from "react-hot-toast";
import { langMap } from "../utils/helper";
import type { User, Problem } from "../types";

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

interface UseRoomSocketProps {
    roomId: string | undefined;
    user: User | null;
    navigate: (path: string) => void;
    setProblem: (p: string) => void;
    setRoomValid: (v: boolean) => void;
    setProblems: (p: Problem[]) => void;
    setLanguage: (l: string) => void;
    setLangId: (id: number) => void;
    setParticipants: (p: User[]) => void;
    setOtherCursors: React.Dispatch<React.SetStateAction<Record<string, CursorState>>>;
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    addNotification: (n: { type: "info" | "success" | "warning" | "error"; title: string; message: string; icon?: string }) => void;
    setRoomCreatedAt?: (createdAt: string) => void;
}

export const useRoomSocket = ({
    roomId,
    user,
    navigate,
    setProblem,
    setRoomValid,
    setProblems,
    setLanguage,
    setLangId,
    setParticipants,
    setOtherCursors,
    setMessages,
    addNotification,
    setRoomCreatedAt
}: UseRoomSocketProps) => {
    // Store mutable values in refs to avoid re-subscribing socket listeners
    // when these change. Socket handlers read the latest value via ref.
    const userRef = useRef(user);
    const navigateRef = useRef(navigate);

    useEffect(() => { userRef.current = user; }, [user]);
    useEffect(() => { navigateRef.current = navigate; }, [navigate]);
    const addNotificationRef = useRef(addNotification);
    useEffect(() => { addNotificationRef.current = addNotification; }, [addNotification]);

    useEffect(() => {
        if (!roomId) return;

        // Connect socket lazily (autoConnect: false)
        if (!socket.connected) {
            socket.connect();
        }

        const checkRoom = async () => {
            try {
                // Auto-enroll participant session when visiting via direct link
                try {
                    const joinRes = await api.post("/rooms/join", { roomId });
                    if (joinRes.data?.accessToken) {
                        localStorage.setItem("accessToken", joinRes.data.accessToken);
                    }
                } catch (err: any) {
                    // If room is full, show error and redirect instead of silently swallowing
                    const status = err?.response?.status;
                    const msg = err?.response?.data?.error?.message || "";
                    if (status === 400 && msg.toLowerCase().includes("full")) {
                        toast.error("Room is full. Only 2 participants allowed.");
                        setRoomValid(false);
                        return;
                    }
                    // Ignore other errors (already joined or host)
                }

                const res = await api.get(`/rooms/${roomId}`);
                setProblem(res.data.problem || "Two Sum");
                if (res.data.createdAt) {
                    setRoomCreatedAt?.(res.data.createdAt);
                }
                // Emit joinRoom only after room is confirmed valid
                socket.emit("joinRoom", { roomId, user: userRef.current });
                socket.emit("candidateReady", { roomId });
            } catch {
                setRoomValid(false);
            }
        };
        const fetchProblems = async () => {
            try { const res = await api.get("/problems"); setProblems(res.data); }
            catch { toast.error("Failed to load problems."); }
        };

        checkRoom();
        fetchProblems();

        const handleSessionEnded = async () => {
            addNotificationRef.current({
                type: "warning",
                title: "Session Ended",
                message: "The interviewer has ended the session. Loading your performance report...",
                icon: "🏁",
            });
            try {
                const res = await api.get("/sessions/my");
                const mySessions = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                const currentSession = mySessions.find((s: { roomId?: string; id?: string }) => s.roomId === roomId);
                if (currentSession?.id) {
                    navigateRef.current(`/report/${currentSession.id}`);
                    return;
                }
            } catch {
                // Fallback to dashboard if session lookup fails
            }
            navigateRef.current("/dashboard");
        };
        const handleLanguageChange = (lang: string) => {
            setLanguage(lang); setLangId(langMap[lang]);
            addNotificationRef.current({ type: "info", title: "Language Changed", message: `Editor language switched to ${lang}.`, icon: "🔄" });
        };
        const handleProblemChange = (newProblem: string) => {
            setProblem(newProblem);
            addNotificationRef.current({ type: "info", title: "Problem Changed", message: `Problem set to "${newProblem}".`, icon: "📋" });
        };
        // Track previous participant count to detect joins
        let prevCount = 0;
        const handlePresenceUpdate = (users: User[]) => {
            if (users.length > prevCount && prevCount > 0) {
                const newUser = users.find(u => u.id !== userRef.current?.id);
                if (newUser) {
                    addNotificationRef.current({ type: "success", title: "Participant Joined", message: `${newUser.name || newUser.role} joined the room.`, icon: "👋" });
                }
            } else if (users.length < prevCount) {
                addNotificationRef.current({ type: "info", title: "Participant Left", message: "A participant left the room.", icon: "👤" });
            }
            prevCount = users.length;
            setParticipants(users);
            setOtherCursors((prev) => {
                const next = { ...prev };
                Object.keys(next).forEach((uid) => { if (!users.some((u) => u.id === uid)) delete next[uid]; });
                return next;
            });
        };
        const handleCursorUpdate = ({ user: cursorUser, position }: { user: User; position: { lineNumber: number; column: number } }) => {
            if (cursorUser.id !== userRef.current?.id) {
                setOtherCursors((prev) => ({ ...prev, [cursorUser.id]: { user: cursorUser, position } }));
            }
        };
        const handleReceiveMessage = (msg: ChatMessage) => {
            setMessages((prev) => [...prev, msg]);
            addNotificationRef.current({ type: "info", title: `${msg.senderName}`, message: msg.text, icon: "💬" });
        };

        socket.on("sessionEnded", handleSessionEnded);
        socket.on("languageChange", handleLanguageChange);
        socket.on("problemChange", handleProblemChange);
        socket.on("presenceUpdate", handlePresenceUpdate);
        socket.on("cursorUpdate", handleCursorUpdate);
        socket.on("receiveMessage", handleReceiveMessage);

        return () => {
            socket.off("sessionEnded", handleSessionEnded);
            socket.off("languageChange", handleLanguageChange);
            socket.off("problemChange", handleProblemChange);
            socket.off("presenceUpdate", handlePresenceUpdate);
            socket.off("cursorUpdate", handleCursorUpdate);
            socket.off("receiveMessage", handleReceiveMessage);
        };
        // Only re-subscribe when roomId changes. Setter functions from useState are stable.
        // user and navigate are accessed via refs inside handlers.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId]);
};
