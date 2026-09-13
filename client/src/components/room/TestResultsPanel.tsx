export interface TestResultItem {
    testIndex: number;
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
}

interface Props {
    testResults: TestResultItem[] | null;
    rawOutput: string;
}

const TestResultsPanel = ({ testResults, rawOutput }: Props) => {
    if (!testResults || testResults.length === 0) {
        return (
            <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                {rawOutput || "Run code to see stdout or test results."}
            </pre>
        );
    }

    const passCount = testResults.filter((r) => r.passed).length;
    const allPassed = passCount === testResults.length;

    return (
        <div className="space-y-4 font-sans text-xs">
            {/* Header Badge */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                    <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                            allPassed
                                ? "bg-green-500/15 text-green-400 border border-green-500/30"
                                : "bg-red-500/15 text-red-400 border border-red-500/30"
                        }`}
                    >
                        {allPassed ? "✅ Accepted" : "❌ Wrong Answer"}
                    </span>
                    <span className="text-gray-400 font-medium">
                        {passCount} / {testResults.length} Test Cases Passed
                    </span>
                </div>
            </div>

            {/* Test Case Details */}
            <div className="space-y-3">
                {testResults.map((res) => (
                    <div
                        key={res.testIndex}
                        className={`p-3.5 rounded-xl border transition ${
                            res.passed
                                ? "bg-green-500/[0.03] border-green-500/20"
                                : "bg-red-500/[0.03] border-red-500/20"
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-gray-200">
                                Case {res.testIndex}
                            </span>
                            <span
                                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                                    res.passed
                                        ? "bg-green-400/20 text-green-400"
                                        : "bg-red-400/20 text-red-400"
                                }`}
                            >
                                {res.passed ? "Pass" : "Fail"}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-[11px]">
                            <div>
                                <span className="text-gray-500 block mb-0.5 text-[10px] font-sans uppercase">Input</span>
                                <div className="bg-black/30 p-2 rounded text-gray-300 truncate">
                                    {res.input}
                                </div>
                            </div>

                            <div>
                                <span className="text-gray-500 block mb-0.5 text-[10px] font-sans uppercase">Expected</span>
                                <div className="bg-black/30 p-2 rounded text-green-400 font-semibold truncate">
                                    {res.expected}
                                </div>
                            </div>

                            <div>
                                <span className="text-gray-500 block mb-0.5 text-[10px] font-sans uppercase">Output</span>
                                <div
                                    className={`p-2 rounded font-semibold truncate ${
                                        res.passed
                                            ? "bg-black/30 text-green-400"
                                            : "bg-red-950/40 text-red-400 border border-red-500/30"
                                    }`}
                                >
                                    {res.actual}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TestResultsPanel;
