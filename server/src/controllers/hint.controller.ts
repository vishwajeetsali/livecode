import type { Request, Response } from "express";
import { HintService } from "../services/hint.service.js";

export const getHint = async (req: Request, res: Response) => {
    let isAborted = false;
    req.on("close", () => { isAborted = true; });

    const { code = "", problem = "Coding Problem" } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const text of HintService.streamHint(code, problem)) {
        if (isAborted) break;
        // Encode newlines within a single SSE data frame so the client
        // receives the complete multi-line text as one event.
        // SSE spec: multiple "data:" lines within one frame are joined with \n by the client.
        const encoded = text.replace(/\n/g, "\ndata: ");
        res.write(`data: ${encoded}\n\n`);
    }

    if (!isAborted) {
        res.write("data: [DONE]\n\n");
        res.end();
    }
};