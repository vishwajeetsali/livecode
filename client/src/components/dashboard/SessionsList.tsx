import { useNavigate } from "react-router-dom";
import type { Session } from "../../types";

const relativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 0) return "Just now";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
};

interface SessionsListProps {
    sessions: Session[];
    loading: boolean;
    isInterviewer?: boolean;
    onEndSession?: (roomId: string) => void;
}

const SessionsList = ({ sessions, loading, isInterviewer, onEndSession }: SessionsListProps) => {
    const navigate = useNavigate();

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Past Sessions</h2>
                <span className="text-[10px] text-[var(--text-muted)] border border-white/[0.06] px-3 py-1 rounded-full font-mono">{sessions.length} sessions</span>
            </div>

            {loading ? (
                <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="glass-card px-6 py-4 flex items-center justify-between">
                            <div className="flex flex-col gap-2 w-1/3">
                                <div className="h-4 skeleton w-full" />
                                <div className="h-3 skeleton w-2/3" />
                            </div>
                            <div className="flex gap-2">
                                <div className="h-6 skeleton w-20 rounded-full" />
                                <div className="h-6 skeleton w-24 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : sessions.length === 0 ? (
                <div className="border border-dashed border-white/[0.08] rounded-2xl p-16 text-center">
                    <p className="text-3xl mb-3">🎯</p>
                    <p className="text-[var(--text-secondary)] font-medium text-sm">No sessions yet</p>
                    <p className="text-[var(--text-muted)] text-xs mt-1">Create or join a room to get started</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {sessions.map((session) => (
                        <div key={session.id} className="glass-card px-6 py-4 flex items-center justify-between group">
                            <div>
                                <p className="font-semibold text-sm flex items-center gap-2">
                                    {session.room?.problem || "Coding Interview"}
                                    <span className="text-[var(--text-muted)] font-mono text-[10px] font-normal">
                                        {session.roomId.length > 12 ? `${session.roomId.slice(0, 8)}...` : session.roomId}
                                    </span>
                                </p>
                                <p className="text-[var(--text-muted)] text-xs mt-1">{relativeTime(session.startTime)}</p>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium flex items-center gap-1.5 ${session.endTime ? "border-green-400/20 text-green-400 bg-green-400/5" : "border-emerald-400/30 text-emerald-400 bg-emerald-400/10 animate-pulse"}`}>
                                    {!session.endTime && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                    {session.endTime ? "Completed" : "In Progress"}
                                </span>
                                {!session.endTime && (
                                    <button
                                        onClick={() => navigate(`/room/${session.roomId}`)}
                                        className="text-[10px] bg-[var(--accent)] text-black px-3 py-1 rounded-full font-bold hover:brightness-110 transition shadow-sm"
                                    >
                                        Rejoin Room →
                                    </button>
                                )}
                                {isInterviewer && !session.endTime && onEndSession && (
                                    <button
                                        onClick={() => onEndSession(session.roomId)}
                                        className="text-[10px] border border-red-500/30 text-red-400 hover:bg-red-500/10 px-3 py-1 rounded-full font-medium transition"
                                    >
                                        End Session
                                    </button>
                                )}
                                {session.report && (
                                    <button
                                        onClick={() => navigate(`/report/${session.id}`)}
                                        className="text-[10px] border border-white/[0.08] px-3 py-1 rounded-full text-[var(--text-muted)] hover:text-white hover:border-white/20 transition font-medium"
                                    >
                                        View Report →
                                    </button>
                                )}
                                {session.endTime && (
                                    <button
                                        onClick={() => navigate(`/replay/${session.id}`)}
                                        className="text-[10px] border border-white/[0.08] px-3 py-1 rounded-full text-[var(--text-muted)] hover:text-white hover:border-white/20 transition font-medium"
                                    >
                                        ▶ Replay
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SessionsList;

