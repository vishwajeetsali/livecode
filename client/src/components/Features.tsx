const features = [
    {
        icon: "🎥",
        title: "Live Video Interviews",
        desc: "Peer-to-peer video powered by WebRTC. No third party servers needed.",
    },
    {
        icon: "💻",
        title: "Real-time Code Editor",
        desc: "VS Code-like Monaco editor synced live between interviewer and candidate.",
    },
    {
        icon: "🤖",
        title: "AI-Powered Hints",
        desc: "Stuck? Get smart, streaming hints without spoiling the full solution.",
    },
    {
        icon: "📊",
        title: "Performance Reports",
        desc: "Automated analysis with coding score, communication rating, and articulation insights.",
    },
    {
        icon: "🔐",
        title: "Secure Authentication",
        desc: "Google OAuth 2.0 with JWT tokens and automatic refresh for seamless sessions.",
    },
    {
        icon: "⚡",
        title: "Custom Problem Bank",
        desc: "Create and manage your own coding problems with examples and constraints.",
    },
];

const Features = () => {
    return (
        <div className="max-w-6xl mx-auto mt-24 px-6 pb-28">
            <div className="text-center mb-14">
                <p className="text-[var(--accent)] text-xs font-semibold tracking-[0.2em] uppercase mb-3">Features</p>
                <h2 className="text-3xl font-black tracking-tight">Everything you need in one platform</h2>
                <p className="text-[var(--text-muted)] mt-2 text-sm max-w-md mx-auto">Built for real technical interviews — from live coding to AI-powered analysis.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {features.map((f) => (
                    <div
                        key={f.title}
                        className="glass-card p-7 group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-xl mb-5 group-hover:bg-[var(--accent)]/15 transition-colors">
                            {f.icon}
                        </div>
                        <h3 className="text-white font-bold text-base mb-2">{f.title}</h3>
                        <p className="text-[var(--text-muted)] text-sm leading-relaxed">{f.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Features;