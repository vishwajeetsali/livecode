import type { Request, Response } from "express";
import type { JwtUser } from "../types/index.js";
import { SessionService } from "../services/session.service.js";

export const getMySessions = async (req: Request, res: Response) => {
    const user = req.user as JwtUser;
    const cursor = req.query.cursor as string | undefined;
    const parsedLimit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const limit = typeof parsedLimit === "number" && !isNaN(parsedLimit) ? parsedLimit : undefined;

    const result = await SessionService.getUserSessions(user.userId, cursor, limit);
    
    // Support backward compatibility if no pagination query params are supplied
    if (!cursor && !req.query.limit) {
        return res.json({ success: true, data: result.items });
    }

    res.json({ success: true, data: result });
};