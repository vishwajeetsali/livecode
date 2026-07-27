import { useState } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";

export const useCodeExecution = () => {
    const [output, setOutput] = useState("");
    const [loadingRun, setLoadingRun] = useState(false);
    const [runCount, setRunCount] = useState(0);

    const executeCode = async (code: string, languageId: number, stdin = "") => {
        try {
            setLoadingRun(true);
            setRunCount((prev) => prev + 1);
            const res = await api.post("/code/execute", { code, languageId, stdin });
            const resultOutput = res.data.output || "No output";
            setOutput(resultOutput);
            return resultOutput;
        } catch {
            toast.error("Code execution failed.");
            return null;
        } finally {
            setLoadingRun(false);
        }
    };

    return {
        output,
        setOutput,
        loadingRun,
        runCount,
        executeCode,
    };
};
