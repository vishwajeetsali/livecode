import type { Request, Response } from "express";
import axios from "axios";

export const executeCode = async (req: Request, res: Response) => {
    try {
        const { code, languageId, stdin } = req.body;

        const submission = await axios.post(
            `${process.env.JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
            {
                source_code: code,
                language_id: languageId,
                stdin: stdin || "",
            },
            { timeout: 15000 }
        );

        const { stdout, stderr, compile_output, status } = submission.data;
        const output = stdout || stderr || compile_output || status?.description || "No output";
        res.json({ output });

    } catch (err) {
        res.status(500).json({ message: "execution failed" });
    }
};
