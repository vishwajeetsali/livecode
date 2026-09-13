import { useState } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";
import type { TestResultItem } from "../components/room/TestResultsPanel";

export const useCodeExecution = () => {
    const [output, setOutput] = useState("");
    const [testResults, setTestResults] = useState<TestResultItem[] | null>(null);
    const [loadingRun, setLoadingRun] = useState(false);
    const [runCount, setRunCount] = useState(0);

    const executeCode = async (code: string, languageId: number, stdin = "", problemTitle = "", examples: unknown[] = []) => {
        try {
            setLoadingRun(true);
            setRunCount((prev) => prev + 1);
            setTestResults(null);
            const res = await api.post("/code/execute", { code, languageId, stdin, problemTitle, examples });
            const resultOutput = res.data.output || "No output";
            setOutput(resultOutput);
            if (res.data.testResults) {
                setTestResults(res.data.testResults);
            }
            return resultOutput;
        } catch (err: any) {
            const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || "Code execution failed.";
            toast.error(errorMsg);
            setOutput(`Error: ${errorMsg}`);
            return null;
        } finally {
            setLoadingRun(false);
        }
    };

    return {
        output,
        setOutput,
        testResults,
        loadingRun,
        runCount,
        executeCode,
    };
};
