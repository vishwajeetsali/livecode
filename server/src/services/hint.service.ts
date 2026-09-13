import Groq from "groq-sdk";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const groq = new Groq({ apiKey: env.GROQ_API_KEY || "dummy_key" });

export const HintService = {
    async *streamHint(code: string, problem: string): AsyncGenerator<string> {
        try {
            const stream = await groq.chat.completions.create({
                model: "llama-3.1-8b-instant",
                stream: true,
                messages: [
                    { role: "system", content: "You are a helpful coding interview assistant. Give small hints only, never full solutions." },
                    { role: "user", content: `Problem: ${problem}\n\nMy current code:\n${code}\n\nGive me a small hint.` },
                ],
            });

            for await (const chunk of stream) {
                const text = chunk.choices[0]?.delta?.content;
                if (text) yield text;
            }
        } catch (err: any) {
            logger.error("AI hint error, outputting fallback hint", { error: err?.message || err });
            yield "Consider breaking the problem into smaller sub-problems. Start by checking your edge cases (empty inputs, single elements) and verifying loop conditions.";
        }
    },
};
