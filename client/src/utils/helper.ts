export const LANGUAGES = [
    { value: "javascript", label: "JavaScript", id: 63 },
    { value: "typescript", label: "TypeScript", id: 74 },
    { value: "python", label: "Python", id: 71 },
    { value: "cpp", label: "C++", id: 54 },
    { value: "java", label: "Java", id: 62 },
    { value: "go", label: "Go", id: 60 },
    { value: "rust", label: "Rust", id: 73 },
    { value: "csharp", label: "C#", id: 51 },
    { value: "php", label: "PHP", id: 68 },
    { value: "ruby", label: "Ruby", id: 72 },
];

export const langMap: Record<string, number> = Object.fromEntries(
    LANGUAGES.map((l) => [l.value, l.id])
);

export const getSupportedMimeType = (): string => {
    const candidates = ["audio/webm", "audio/webm;codecs=opus", "audio/mp4", "audio/ogg"];
    for (const type of candidates) {
        if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return "";
};

export const formatTime = (s: number): string => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
};

/**
 * Safely coerce any value to a plain string.
 * The AI occasionally returns nested objects instead of plain strings,
 * especially for Hard-level questions. This prevents React from crashing
 * with "Objects are not valid as a React child".
 */
export const safeStr = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "string") return val;
    if (typeof val === "number") return String(val);
    try { return JSON.stringify(val); } catch { return String(val); }
};