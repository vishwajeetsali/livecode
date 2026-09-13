import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        if (import.meta.env.DEV) console.error("Uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = "/dashboard";
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[var(--bg-deep)] text-white flex flex-col items-center justify-center p-6 font-sans">
                    <div className="max-w-md w-full glass-card p-8 text-center shadow-2xl backdrop-blur-xl">
                        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6">
                            ⚠️
                        </div>
                        <h1 className="text-2xl font-black mb-3 tracking-tight">Something went wrong</h1>
                        <p className="text-[var(--text-muted)] text-sm mb-6 leading-relaxed">
                            An unexpected application error occurred. We have logged the details.
                        </p>
                        {import.meta.env.DEV && this.state.error && (
                            <div className="bg-black/40 border border-white/[0.06] rounded-xl p-4 mb-6 text-left overflow-x-auto max-h-40 font-mono text-xs text-red-300">
                                {this.state.error.toString()}
                            </div>
                        )}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={this.handleReset}
                                className="w-full bg-[var(--accent)] text-black font-bold py-3 rounded-xl hover:bg-[var(--accent-hover)] transition text-sm shadow-lg shadow-green-400/15"
                            >
                                Return to Dashboard
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full border border-white/[0.08] text-[var(--text-secondary)] font-semibold py-3 rounded-xl hover:bg-white/[0.04] transition text-sm"
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
