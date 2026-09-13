import type { RefObject } from "react";

interface VideoPanelProps {
    localVideoRef: RefObject<HTMLVideoElement | null>;
    remoteVideoRef: RefObject<HTMLVideoElement | null>;
    cameraAllowed: boolean;
    remoteConnected?: boolean;
    remoteHasVideo?: boolean;
}

const VideoPanel = ({ localVideoRef, remoteVideoRef, cameraAllowed, remoteConnected, remoteHasVideo }: VideoPanelProps) => {
    return (
        <div className="h-44 border-b border-white/[0.06] bg-[var(--bg-deep)] relative overflow-hidden flex items-center justify-center">
            {/* Status / Placeholder Layers */}
            {!remoteConnected ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)] text-[10px] gap-1.5 select-none bg-[var(--bg-deep)] z-0">
                    <span className="text-xl opacity-60">👤</span>
                    <span className="font-medium tracking-wide">Waiting for collaborator...</span>
                </div>
            ) : !remoteHasVideo ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-400 text-[10px] gap-2 select-none bg-[var(--bg-surface)]/60 z-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-base animate-pulse">
                        🎙️
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                        <span className="font-bold text-xs text-white">Audio Connected</span>
                        <span className="text-[10px] text-[var(--text-muted)]">(Camera in use or disabled)</span>
                    </div>
                </div>
            ) : null}

            {/* Remote Video */}
            <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${remoteConnected && remoteHasVideo ? "opacity-100 z-10" : "opacity-0 pointer-events-none"}`}
            />

            {/* Local Video PIP */}
            <div className="absolute bottom-2 right-2 w-20 h-14 rounded-lg border border-white/[0.08] bg-[var(--bg-surface)] overflow-hidden flex items-center justify-center z-20 shadow-lg shadow-black/40">
                {cameraAllowed ? (
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[7px] text-amber-300 bg-amber-950/30 font-semibold text-center p-1 leading-tight select-none">
                        <span>🎙️ Mic Only</span>
                        <span className="text-[6px] opacity-70">Cam in use</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoPanel;

