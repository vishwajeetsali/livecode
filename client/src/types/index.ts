export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    role: "INTERVIEWER" | "CANDIDATE";
}

export interface Room {
    id: string;
    userId: string;
    mode: "LIVE" | "MOCK" | "REAL";
    problem?: string | null;
    createdAt: string;
    sessions?: Session[];
}

export interface Session {
    id: string;
    roomId: string;
    userId: string;
    startTime: string;
    endTime?: string | null;
    room?: Room;
    report?: Report | null;
}

export interface Report {
    id: string;
    sessionId: string;
    codeScore?: number | null;
    communicationScore?: number | null;
    problemSolvingScore?: number | null;
    fillerWords?: number | null;
    transcript?: string | null;
    approach?: string | null;
    verdict?: string | null;
    tips?: string | null;
    strengths?: string[];
    weaknesses?: string[];
    createdAt: string;
    session?: Session;
}

export interface Problem {
    id: string;
    title: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    description: string;
    examples?: { input: string; output: string }[];
    constraints?: string[];
    createdAt: string;
}