import type { Request, Response, NextFunction } from "express";
import { replayService } from "../services/replay.service.js";
import { NotFoundError } from "../errors/AppError.js";
import type { JwtUser } from "../types/index.js";

export const getReplay = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sessionId = req.params.sessionId as string;
        const user = req.user as JwtUser;

        const events = await replayService.getBySessionId(sessionId, user.userId);

        if (!events) {
            throw new NotFoundError("Replay not found or access denied");
        }

        res.json({ success: true, data: events });
    } catch (error) {
        next(error);
    }
};
