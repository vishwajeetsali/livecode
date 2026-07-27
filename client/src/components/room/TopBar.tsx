import type { User, Problem } from "../../types";
import { formatTime } from "../../utils/helper";
import toast from "react-hot-toast";

interface TopBarProps {
    id: string | undefined;
    elapsed: number;
    problem: string;
    problems: Problem[];
    participants: User[];
    user: User | null;
    isInterviewer: boolean;
    showProblemPicker: boolean;
    setShowProblemPicker: (v: boolean) => void;
    showDescription: boolean;
    setShowDescription: (v: boolean) => void;
    selectedProblem: Problem | null;
    loadingEnd: boolean;
    onSelectProblem: (title: string) => void;
    onEndSession: () => void;
}

const difficultyStyle: Record<string, string> = {
    Easy: "text-green-400 border-green-400/20 bg-green-400/5",
    Medium: "text-yellow-400 border-yellow-400/20 bg-yellow-400/5",
    Hard: "text-red-400 border-red-400/20 bg-red-400/5",
};

const TopBar = ({
    id, elapsed, problem, problems, participants, user, isInterviewer,
    showProblemPicker, setShowProblemPicker, showDescription, setShowDescription,
    selectedProblem, loadingEnd, onSelectProblem, onEndSession
}: TopBarProps) => {
    return (
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/[0.06] bg-[var(--bg-deep)]">
            {/* Left cluster */}
            <div className="flex items-center gap-3">
                <span className="text-[var(--accent)] font-bold text-sm">LiveCode</span>
                <div className="w-px h-4 bg-white/[0.08]" />
                <span className="text-[var(--text-muted)] text-xs font-mono">
                    {id && id.length > 12 ? `${id.slice(0, 8)}...` : id}
                </span>
                <button
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/room/${id}`); toast.success("Room link copied!"); }}
                    className="btn btn-secondary btn-sm text-[10px]"
                >
                    Copy Link
                </button>
                <div className="w-px h-4 bg-white/[0.08]" />
                <span className="font-mono text-[var(--text-secondary)] text-xs">⏱ {formatTime(elapsed)}</span>

                {/* Presence */}
                <div className="flex items-center gap-1.5 ml-2">
                    {participants.map((pUser) => {
                        const displayName = pUser.name || (pUser.id === user?.id ? "Me" : pUser.role);
                        return (
                            <div
                                key={pUser.id}
                                title={`${displayName} (${pUser.role})`}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                    pUser.role === "INTERVIEWER"
                                        ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                        : "bg-green-500/10 border-green-500/20 text-green-400"
                                }`}
                            >
                                {pUser.avatar ? (
                                    <img src={pUser.avatar} alt={displayName} className="w-3.5 h-3.5 rounded-full" />
                                ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                )}
                                <span>{displayName}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Center controls */}
            <div className="flex items-center gap-2">
                <div className="relative">
                    <button
                        onClick={() => isInterviewer && setShowProblemPicker(!showProblemPicker)}
                        className="btn btn-secondary btn-sm"
                    >
                        📋 {problem}
                    </button>
                    {showProblemPicker && isInterviewer && (
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-[var(--bg-surface)] border border-white/[0.08] rounded-xl overflow-hidden z-50 w-64 max-h-60 overflow-y-auto shadow-xl shadow-black/40">
                            {problems.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => onSelectProblem(p.title)}
                                    className="w-full text-left px-4 py-2.5 text-xs text-[var(--text-secondary)] hover:bg-white/5 transition flex items-center justify-between"
                                >
                                    <span>{p.title}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${difficultyStyle[p.difficulty]}`}>{p.difficulty}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {selectedProblem && (
                    <button
                        onClick={() => setShowDescription(!showDescription)}
                        className={`btn btn-sm ${
                            showDescription ? "btn-primary" : "btn-secondary"
                        }`}
                    >
                        📖 Description
                    </button>
                )}
            </div>

            {/* Right */}
            {isInterviewer ? (
                <button
                    onClick={onEndSession}
                    disabled={loadingEnd}
                    className="btn btn-danger btn-sm"
                >
                    {loadingEnd ? "Ending..." : "End Session"}
                </button>
            ) : <div />}
        </div>
    );
};

export default TopBar;
