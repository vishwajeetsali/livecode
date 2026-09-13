import Groq from "groq-sdk";
import { toFile } from "groq-sdk/uploads";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const groq = new Groq({ apiKey: env.GROQ_API_KEY || "dummy_key" });

const FILLER_WORDS = ["um", "uh", "like", "you know", "so", "actually", "basically"];

export const TranscribeService = {
    async transcribe(fileBuffer: Buffer, originalName?: string): Promise<{ transcript: string; fillerCount: number }> {
        // If the recording is empty or too small to contain real audio, skip Whisper
        if (!fileBuffer || fileBuffer.length < 1000) {
            return { transcript: "", fillerCount: 0 };
        }

        try {
            const transcription = await groq.audio.transcriptions.create({
                file: await toFile(fileBuffer, `audio.${originalName?.split(".").pop() || "webm"}`),
                model: "whisper-large-v3",
            });

            const transcript = transcription.text || "";

            const lowerText = transcript.toLowerCase();
            let fillerCount = 0;
            for (const word of FILLER_WORDS) {
                const matches = lowerText.match(new RegExp(`\\b${word}\\b`, "g"));
                fillerCount += matches ? matches.length : 0;
            }

            return { transcript, fillerCount };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.warn("Transcription skipped", { error: msg });
            // Return empty transcript so the submit flow can continue
            return { transcript: "", fillerCount: 0 };
        }
    },
};
