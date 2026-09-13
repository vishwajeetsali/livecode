import type { Request, Response } from "express";
import { TranscribeService } from "../services/transcribe.service.js";
import { BadRequestError } from "../errors/AppError.js";

export const transcribeAudio = async (req: Request, res: Response) => {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) throw new BadRequestError("No audio file provided");

    const result = await TranscribeService.transcribe(file.buffer, file.originalname);
    res.json({ success: true, data: result });
};