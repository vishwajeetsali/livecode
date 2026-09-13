interface JoinRoomCardProps {
    roomId: string;
    setRoomId: (v: string) => void;
    loadingJoin: boolean;
    onJoinRoom: () => void;
}

const JoinRoomCard = ({ roomId, setRoomId, loadingJoin, onJoinRoom }: JoinRoomCardProps) => (
    <div className="glass-card p-8 relative overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-400/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-400/10 transition-all duration-500" />
        <p className="text-[10px] text-[var(--accent)] tracking-[0.2em] uppercase font-semibold mb-4">Join Existing</p>
        <h2 className="text-xl font-black mb-1">Join Room</h2>
        <p className="text-[var(--text-muted)] text-sm mb-7">Got a room ID? Jump straight into the interview.</p>
        <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Paste Room ID here..."
            className="w-full bg-[var(--bg-interactive)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] mb-3 outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20 transition-all text-sm font-mono"
        />
        <button
            onClick={onJoinRoom}
            disabled={loadingJoin}
            className="w-full btn btn-primary btn-md"
        >
            {loadingJoin ? "Joining..." : "Join Room →"}
        </button>
    </div>
);

export default JoinRoomCard;
