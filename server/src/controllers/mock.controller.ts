import type { Request, Response } from "express";
import type { JwtUser } from "../types/index.js";
import { MockService } from "../services/mock.service.js";

export const generateQuestion = async (req: Request, res: Response) => {
    const { difficulty = "medium", role = "sde" } = req.body;
    const question = await MockService.generateQuestion(difficulty, role);
    res.json({ success: true, data: question });
};

export const startMockSession = async (req: Request, res: Response) => {
    const user = req.user as JwtUser;
    const result = await MockService.startSession(user.userId);
    res.json({ success: true, data: result });
};