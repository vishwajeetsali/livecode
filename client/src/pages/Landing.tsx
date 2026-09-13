import Navbar from "../components/Navbar";
import Features from "../components/Features";

const Landing = () => {
    return (
        <div className="min-h-screen bg-[var(--bg-deep)] text-white overflow-hidden animate-page-fade">

            {/* Ambient glow */}
            <div className="fixed top-[-200px] left-[-200px] w-[600px] h-[600px] bg-green-500/[0.07] rounded-full blur-[150px] pointer-events-none" aria-hidden="true" />
            <div className="fixed bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-emerald-500/[0.05] rounded-full blur-[150px] pointer-events-none" aria-hidden="true" />

            <Navbar />

            <main id="main-content">
            {/* ─── Hero ───────────────────────────────────────────────────────── */}
            <section className="relative flex flex-col items-center justify-center text-center pt-28 pb-20 px-4" aria-labelledby="hero-title">

                {/* Badge */}
                <div className="flex items-center gap-2 bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-[11px] px-4 py-1.5 rounded-full mb-8 tracking-[0.15em] uppercase font-medium">
                    <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse" />
                    AI-Powered Interview Platform
                </div>

                {/* Title */}
                <h1 id="hero-title" className="text-6xl md:text-7xl font-black mb-6 leading-[1.05] tracking-tighter max-w-4xl">
                    Ace Your Next<br />
                    <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-green-500 bg-clip-text text-transparent">
                        Technical Interview
                    </span>
                </h1>

                {/* Subtitle */}
                <p className="text-[var(--text-secondary)] text-lg mb-10 max-w-xl leading-relaxed">
                    Live code together, get AI hints in real-time, and receive a detailed performance report — all in one platform.
                </p>

                {/* CTA */}
                <div className="flex gap-4" role="group" aria-label="Get started">
                    <a
                        href={`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/google`}
                        className="btn btn-primary btn-lg no-underline"
                        role="button"
                        aria-label="Start Free"
                    >
                        Start Free →
                    </a>
                    <button
                        onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                        className="btn btn-secondary btn-lg"
                    >
                        See Features
                    </button>
                </div>

            </section>

            <div className="gradient-divider" />

            {/* ─── How It Works ────────────────────────────────────────────── */}
            <section className="max-w-5xl mx-auto px-6 py-24">
                <div className="text-center mb-14">
                    <p className="text-[var(--accent)] text-xs font-semibold tracking-[0.2em] uppercase mb-3">How It Works</p>
                    <h2 className="text-3xl font-black tracking-tight">Three steps to a better interview</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                    {/* Connecting line (desktop) */}
                    <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px border-t border-dashed border-white/10" aria-hidden="true" />

                    {[
                        { step: "01", icon: "🚀", title: "Create or Join", desc: "Start an interview room in one click, or join with a shared room ID." },
                        { step: "02", icon: "💻", title: "Code Together", desc: "Collaborative Monaco editor with live video, chat, and cursor tracking." },
                        { step: "03", icon: "📊", title: "Get AI Report", desc: "Automated performance analysis with coding score and communication rating." },
                    ].map((item) => (
                        <div key={item.step} className="flex flex-col items-center text-center">
                            <div className="relative z-10 w-14 h-14 rounded-2xl bg-[var(--bg-surface)] border border-white/10 flex items-center justify-center text-2xl mb-5">
                                {item.icon}
                            </div>
                            <span className="text-[10px] text-[var(--accent)] font-bold tracking-[0.2em] uppercase mb-2">Step {item.step}</span>
                            <h3 className="text-white font-bold text-base mb-1.5">{item.title}</h3>
                            <p className="text-[var(--text-muted)] text-sm leading-relaxed max-w-[240px]">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <div className="gradient-divider" />

            {/* ─── Features ───────────────────────────────────────────────── */}
            <div id="features">
                <Features />
            </div>

            <div className="gradient-divider" />

            {/* ─── Footer ─────────────────────────────────────────────────── */}
            <footer className="py-12 text-center">
                <p className="text-white text-sm font-bold mb-1">
                    Live<span className="text-[var(--accent)]">Code</span>
                </p>
                <p className="text-[var(--text-muted)] text-xs">
                    Built with React, Node.js, Socket.IO, and AI
                </p>
            </footer>
            </main>
        </div>
    );
};

export default Landing;