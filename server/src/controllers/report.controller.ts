import type { Request, Response } from "express";
import type { JwtUser } from "../types/index.js";
import { ReportService } from "../services/report.service.js";
import { withSpan } from "../middleware/tracing.js";

export const generateReport = async (req: Request, res: Response) => {
    const user = req.user as JwtUser;
    const { sessionId, problem, runCount } = req.body;
    const result = await withSpan("report.generate", {
        "session.id": sessionId || "unknown",
        "report.problem": problem || "unknown",
        "report.run_count": runCount || 0,
    }, async (span) => {
        const data = await ReportService.generate(req.body, user.userId);
        span.setAttribute("report.success", true);
        return data;
    });
    res.json({ success: true, data: result });
};

export const getReport = async (req: Request, res: Response) => {
    const user = req.user as JwtUser;
    const { sessionId } = req.params as { sessionId: string };
    const report = await ReportService.getBySessionId(sessionId, user.userId);
    res.json({ success: true, data: report });
};