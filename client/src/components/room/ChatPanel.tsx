import { useRef, useEffect } from "react";
import type { User } from "../../types";

interface ChatMessage {
    senderId: string;
    senderName: string;
    senderAvatar?: string | null;
    text: string;
    timestamp: string;
}

interface ChatPanelProps {
    messages: ChatMessage[];
    newMessage: string;
    setNewMessage: (v: string) => void;
    onSendMessage: (e: React.FormEvent) => void;
    user: User | null;
}

const ChatPanel = ({ messages, newMessage, setNewMessage, onSendMessage, user }: ChatPanelProps) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <>
            {/* Header */}
            <div className="flex items-center px-4 py-2 border-b border-white/[0.06] bg-[var(--bg-surface)]">
                <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--text-muted)]">Discussion</span>
                <span className="ml-auto text-[10px] text-[var(--text-muted)] font-mono">{messages.length}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3" role="log" aria-label="Chat messages" aria-live="polite">
                {messages.length === 0 ? (
                    <p className="text-[var(--text-muted)] text-[10px] text-center mt-4">No messages yet. Say hello!</p>
                ) : (
                    messages.map((msg, index) => {
                        const isSelf = msg.senderId === user?.id;
                        return (
                            <div key={index} className={`flex items-start gap-2 ${isSelf ? "flex-row-reverse" : ""}`}>
                                {msg.senderAvatar ? (
                                    <img src={msg.senderAvatar} alt={msg.senderName} className="w-5 h-5 rounded-full mt-0.5 ring-1 ring-white/10" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center text-[8px] font-bold text-[var(--text-muted)] mt-0.5">
                                        {msg.senderName.slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <div className={`flex flex-col max-w-[75%] ${isSelf ? "items-end" : ""}`}>
                                    <span className="text-[9px] text-[var(--text-muted)] mb-0.5">{msg.senderName}</span>
                                    <div className={`px-3 py-1.5 rounded-2xl text-xs leading-relaxed ${
                                        isSelf ? "bg-[var(--accent)]/15 text-green-200 rounded-tr-none" : "bg-white/[0.04] text-[var(--text-secondary)] rounded-tl-none"
                                    }`}>
                                        <p className="break-all">{msg.text}</p>
                                    </div>
                                    <span className="text-[8px] text-[var(--text-muted)] mt-0.5">{msg.timestamp}</span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={onSendMessage} className="p-2.5 border-t border-white/[0.04] bg-[var(--bg-surface)] flex items-center gap-2" aria-label="Send a chat message">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    aria-label="Chat message"
                    className="flex-1 bg-white/[0.03] border border-white/[0.06] text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-[var(--accent)]/40 transition"
                />
                <button type="submit" className="btn btn-primary btn-sm" aria-label="Send">
                    Send
                </button>
            </form>
        </>
    );
};

export default ChatPanel;
