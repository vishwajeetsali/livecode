import type { Request, Response } from "express";
import { CodeService } from "../services/code.service.js";
import { withSpan } from "../middleware/tracing.js";

export const executeCode = async (req: Request, res: Response) => {
    const { code, languageId, stdin, problemTitle, examples } = req.body;
    const result = await withSpan("code.execute", {
        "code.language_id": languageId || 0,
        "code.problem": problemTitle || "freestyle",
        "code.has_tests": !!examples,
        "code.size_bytes": code?.length || 0,
    }, async (span) => {
        const data = await CodeService.execute({ code, languageId, stdin, problemTitle, examples });
        span.setAttribute("code.execution_success", true);
        return data;
    });
    res.json({ success: true, data: result });
};
