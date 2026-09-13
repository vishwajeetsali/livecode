import type { Request, Response, NextFunction } from "express";
import { ReviewService } from "../services/review.service.js";

export const reviewCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code = "", problem = "Coding Problem", language = "javascript" } = req.body;

        const comments = await ReviewService.reviewCode(code, problem, language);

        res.json({ success: true, data: comments });
    } catch (error) {
        next(error);
    }
};
