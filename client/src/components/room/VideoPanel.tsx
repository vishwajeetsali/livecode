import type { RefObject } from "react";

interface VideoPanelProps {
    localVideoRef: RefObject<HTMLVideoElement | null>;
    remoteVideoRef: RefObject<HTMLVideoElement | null>;
    cameraAllowed: boolean;
}

const VideoPanel = ({ localVideoRef, remoteVideoRef, cameraAllowed }: VideoPanelProps) => {
    return (
        <div className="h-44 border-b border-white/[0.06] bg-[var(--bg-deep)] relative overflow-hidden flex items-center justify-center">
            {/* Placeholder */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)] text-[10px] gap-1 select-none">
                <span className="text-sm">👤</span>
                <span>Waiting for collaborator...</span>
            </div>
            {/* Remote Video */}
            <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover bg-transparent" />

            {/* Local Video PIP */}
            <div className="absolute bottom-2 right-2 w-20 h-14 rounded-lg border border-white/[0.08] bg-[var(--bg-surface)] overflow-hidden flex items-center justify-center z-20 shadow-lg shadow-black/30">
                {cameraAllowed ? (
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[7px] text-red-400 bg-red-950/20 font-semibold text-center p-1 leading-tight select-none">
                        <span>⚠️ Cam</span>
                        <span>Blocked</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoPanel;
