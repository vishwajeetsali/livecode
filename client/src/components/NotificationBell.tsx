import { useState, useRef, useEffect } from "react";
import { useNotifications, type Notification } from "../features/notifications";

const NotificationBell = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, removeNotification } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Close panel on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen]);

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diff < 60) return "Just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const typeColors: Record<string, string> = {
        info: "bg-blue-400",
        success: "bg-green-400",
        warning: "bg-yellow-400",
        error: "bg-red-400",
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/[0.05] transition"
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-[var(--danger)] text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse min-w-[18px] px-0.5">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div
                    className="absolute right-0 top-11 w-80 max-h-96 bg-[var(--bg-surface)] border border-white/[0.08] rounded-xl shadow-xl shadow-black/40 z-50 overflow-hidden flex flex-col animate-page-fade"
                    role="region"
                    aria-label="Notifications"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                        <h3 className="text-xs font-semibold text-white tracking-wide">Notifications</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-[10px] text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition"
                                    aria-label="Mark all as read"
                                >
                                    Mark all read
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={clearAll}
                                    className="text-[10px] text-[var(--text-muted)] hover:text-[var(--danger)] font-medium transition"
                                    aria-label="Clear all notifications"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="flex-1 overflow-y-auto" role="list" aria-label="Notification list">
                        {notifications.length === 0 ? (
                            <div className="py-10 text-center">
                                <div className="text-2xl mb-2">🔔</div>
                                <p className="text-[var(--text-muted)] text-xs">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((n: Notification) => (
                                <div
                                    key={n.id}
                                    role="listitem"
                                    className={`group flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] cursor-pointer transition hover:bg-white/[0.03] ${
                                        !n.read ? "bg-white/[0.02]" : ""
                                    }`}
                                    onClick={() => markAsRead(n.id)}
                                >
                                    {/* Type indicator */}
                                    <div className="mt-1.5 shrink-0">
                                        {n.icon ? (
                                            <span className="text-sm">{n.icon}</span>
                                        ) : (
                                            <div className={`w-2 h-2 rounded-full ${typeColors[n.type] || typeColors.info}`} />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={`text-xs font-semibold truncate ${!n.read ? "text-white" : "text-[var(--text-secondary)]"}`}>
                                                {n.title}
                                            </p>
                                            {!n.read && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" aria-label="Unread" />
                                            )}
                                        </div>
                                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">
                                            {n.message}
                                        </p>
                                        <p className="text-[9px] text-[var(--text-muted)] mt-1 font-mono">
                                            {formatTime(n.timestamp)}
                                        </p>
                                    </div>

                                    {/* Dismiss */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                                        className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--danger)] transition text-xs mt-1"
                                        aria-label={`Dismiss notification: ${n.title}`}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
