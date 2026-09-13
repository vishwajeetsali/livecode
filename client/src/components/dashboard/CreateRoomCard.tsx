interface CreateRoomCardProps {
    loadingCreate: boolean;
    onCreateRoom: (mode: string) => void;
}

const CreateRoomCard = ({ loadingCreate, onCreateRoom }: CreateRoomCardProps) => (
    <div className="glass-card p-8 relative overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-[var(--accent)]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[var(--accent)]/10 transition-all duration-500" />
        <p className="text-[10px] text-[var(--accent)] tracking-[0.2em] uppercase font-semibold mb-4">New Session</p>
        <h2 className="text-xl font-black mb-1">Create Room</h2>
        <p className="text-[var(--text-muted)] text-sm mb-7">Start a session as interviewer or practice solo with AI.</p>
        <div className="flex flex-col gap-3">
            <button
                onClick={() => onCreateRoom("real")}
                disabled={loadingCreate}
                className="w-full btn btn-primary btn-md"
            >
                {loadingCreate ? "Creating..." : "🎙️ Real Interview"}
            </button>
            <button
                onClick={() => onCreateRoom("mock")}
                className="w-full btn btn-secondary btn-md"
            >
                🤖 Mock with AI
            </button>
        </div>
    </div>
);

export default CreateRoomCard;
