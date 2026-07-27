import { useState, useEffect } from "react";

export const MobileNotice = () => {
    const [dismissed, setDismissed] = useState(true);

    useEffect(() => {
        // Only show if it wasn't dismissed in the current session
        const isDismissed = sessionStorage.getItem("mobile-notice-dismissed");
        if (!isDismissed) {
            setDismissed(false);
        }
    }, []);

    const handleDismiss = () => {
        sessionStorage.setItem("mobile-notice-dismissed", "true");
        setDismissed(true);
    };

    if (dismissed) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 lg:hidden font-sans">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-2xl backdrop-blur-xl flex flex-col gap-3 max-w-md mx-auto">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center text-sm shrink-0">
                        💻
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white">Desktop Optimized</h4>
                        <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                            LiveCode is designed for larger screens to support code editing and live audio/video. Please switch to a desktop for the best experience.
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-1">
                    <button
                        onClick={handleDismiss}
                        className="px-4 py-1.5 bg-[var(--accent)] text-black text-xs font-bold rounded-lg hover:bg-[var(--accent-hover)] transition"
                    >
                        I Understand
                    </button>
                </div>
            </div>
        </div>
    );
};
