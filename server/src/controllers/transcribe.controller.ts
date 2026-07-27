import type { Request, Response } from "express";
import multer from "multer";
import Groq from "groq-sdk";
import { toFile } from "groq-sdk/uploads";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const FILLER_WORDS = ["um", "uh", "like", "you know", "so", "actually", "basically"];

export const transcribeAudio = async (req: Request, res: Response) => {
    try {
        const file = (req as Request & { file?: Express.Multer.File }).file;
        if (!file) {
            return res.status(400).json({ message: "No audio file provided" });
        }

        // If the recording is empty or too small to contain real audio, skip Whisper
        // to avoid a "no audio track found" error from Groq.
        if (!file.buffer || file.buffer.length < 1000) {
            return res.json({ transcript: "", fillerCount: 0 });
        }

        const transcription = await groq.audio.transcriptions.create({
            file: await toFile(file.buffer, `audio.${file.originalname?.split(".").pop() || "webm"}`),
            model: "whisper-large-v3",
        });

        const transcript = transcription.text || "";

        const lowerText = transcript.toLowerCase();
        let fillerCount = 0;
        for (const word of FILLER_WORDS) {
            const matches = lowerText.match(new RegExp(`\\b${word}\\b`, "g"));
            fillerCount += matches ? matches.length : 0;
        }

        res.json({ transcript, fillerCount });
    } catch (error) {
        // Log a compact message instead of a full stack trace for known Groq errors
        const msg = error instanceof Error ? error.message : String(error);
        console.warn("Transcription skipped:", msg);
        // Return empty transcript so the submit flow can continue
        res.json({ transcript: "", fillerCount: 0 });
    }
};