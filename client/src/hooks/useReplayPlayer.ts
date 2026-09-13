import { useState, useEffect, useRef, useCallback } from "react";

export interface ReplayEvent {
    type: "code" | "cursor" | "language";
    timestamp: number;
    data: Record<string, unknown>;
}

interface ReplayState {
    code: string;
    language: string;
    cursorPosition: { lineNumber: number; column: number } | null;
}

interface UseReplayPlayerReturn {
    /** Current code snapshot at playback position */
    state: ReplayState;
    /** Current playback time in ms */
    currentTime: number;
    /** Total duration of the replay in ms */
    duration: number;
    /** Whether playback is active */
    isPlaying: boolean;
    /** Current playback speed multiplier */
    speed: number;
    /** Progress as a 0-1 fraction */
    progress: number;
    /** Start or resume playback */
    play: () => void;
    /** Pause playback */
    pause: () => void;
    /** Toggle play/pause */
    toggle: () => void;
    /** Seek to a specific time in ms */
    seekTo: (timeMs: number) => void;
    /** Seek to a progress fraction (0-1) */
    seekToProgress: (fraction: number) => void;
    /** Set playback speed */
    setSpeed: (speed: number) => void;
}

/**
 * Computes the replay state at a given timestamp by replaying all events
 * up to that point. Only "code" and "language" events mutate visible state.
 */
function computeStateAtTime(events: ReplayEvent[], timeMs: number): ReplayState {
    const state: ReplayState = {
        code: "// Start coding here...",
        language: "javascript",
        cursorPosition: null,
    };

    for (const event of events) {
        if (event.timestamp > timeMs) break;

        switch (event.type) {
            case "code":
                state.code = (event.data.code as string) || state.code;
                break;
            case "language":
                state.language = (event.data.language as string) || state.language;
                break;
            case "cursor":
                state.cursorPosition = {
                    lineNumber: event.data.lineNumber as number,
                    column: event.data.column as number,
                };
                break;
        }
    }

    return state;
}

export function useReplayPlayer(events: ReplayEvent[]): UseReplayPlayerReturn {
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);

    const duration = events.length > 0 ? events[events.length - 1].timestamp : 0;
    const progress = duration > 0 ? currentTime / duration : 0;

    // Use refs for animation frame values to avoid stale closures
    const rafRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(0);
    const currentTimeRef = useRef(currentTime);
    const speedRef = useRef(speed);
    const isPlayingRef = useRef(isPlaying);

    // Keep refs in sync
    useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
    useEffect(() => { speedRef.current = speed; }, [speed]);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

    const tickRef = useRef<(frameTime: number) => void>(() => {});

    const tick = useCallback((frameTime: number) => {
        if (!isPlayingRef.current) return;

        if (lastFrameTimeRef.current > 0) {
            const delta = (frameTime - lastFrameTimeRef.current) * speedRef.current;
            const nextTime = currentTimeRef.current + delta;

            if (nextTime >= duration) {
                setCurrentTime(duration);
                setIsPlaying(false);
                lastFrameTimeRef.current = 0;
                return;
            }

            setCurrentTime(nextTime);
        }

        lastFrameTimeRef.current = frameTime;
        rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
    }, [duration]);

    useEffect(() => {
        tickRef.current = tick;
    }, [tick]);

    useEffect(() => {
        if (isPlaying) {
            lastFrameTimeRef.current = 0;
            rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
        } else {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            lastFrameTimeRef.current = 0;
        }

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [isPlaying, tick]);

    const state = computeStateAtTime(events, currentTime);

    const play = useCallback(() => {
        if (currentTimeRef.current >= duration && duration > 0) {
            setCurrentTime(0);
        }
        setIsPlaying(true);
    }, [duration]);

    const pause = useCallback(() => setIsPlaying(false), []);

    const toggle = useCallback(() => {
        if (isPlayingRef.current) {
            pause();
        } else {
            play();
        }
    }, [play, pause]);

    const seekTo = useCallback((timeMs: number) => {
        const clamped = Math.max(0, Math.min(timeMs, duration));
        setCurrentTime(clamped);
    }, [duration]);

    const seekToProgress = useCallback((fraction: number) => {
        seekTo(fraction * duration);
    }, [seekTo, duration]);

    return {
        state,
        currentTime,
        duration,
        isPlaying,
        speed,
        progress,
        play,
        pause,
        toggle,
        seekTo,
        seekToProgress,
        setSpeed,
    };
}
