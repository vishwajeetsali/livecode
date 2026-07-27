import type { Request, Response } from "express";
import Groq from "groq-sdk";
import type { JwtUser } from "../types/index.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const groq = new Groq({ apiKey: env.GROQ_API_KEY || "dummy_key" });

export const getHint = async (req: Request, res: Response) => {
    let streamStarted = false;
    let isAborted = false;

    req.on("close", () => {
        isAborted = true;
    });

    try {
        const user = req.user as JwtUser;

        if (user.role === "CANDIDATE") {
            return res.status(403).json({ message: "hints not available during live interview" });
        }

        const { code, problem } = req.body;

        const stream = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            stream: true,
            messages: [
                { role: "system", content: "You are a helpful coding interview assistant. Give small hints only, never full solutions." },
                { role: "user", content: `Problem: ${problem}\n\nMy current code:\n${code}\n\nGive me a small hint.` },
            ],
        });

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        streamStarted = true;

        for await (const chunk of stream) {
            if (isAborted) {
                logger.info("Client aborted hint SSE stream");
                break;
            }
            const text = chunk.choices[0]?.delta?.content;
            if (text) res.write(`data: ${text}\n\n`);
        }

        if (!isAborted) {
            res.write("data: [DONE]\n\n");
            res.end();
        }

    } catch (err: any) {
        logger.error("AI hint error", { error: err?.message || err });
        if (!streamStarted) {
            res.status(500).json({ message: "hint failed" });
        } else {
            res.end();
        }
    }
};