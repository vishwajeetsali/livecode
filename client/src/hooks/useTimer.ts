import { useState, useEffect, useRef } from "react";

export const useTimer = (isActive = true, startTimestamp?: number | string | Date | null) => {
    const [elapsed, setElapsed] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    const accumulatedRef = useRef(0);

    useEffect(() => {
        if (!isActive) {
            if (startTimeRef.current !== null) {
                accumulatedRef.current += Date.now() - startTimeRef.current;
                startTimeRef.current = null;
            }
            return;
        }

        const updateTimer = () => {
            if (startTimestamp) {
                const startMs = new Date(startTimestamp).getTime();
                if (!isNaN(startMs)) {
                    setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
                    return;
                }
            }

            if (startTimeRef.current !== null) {
                const currentSegment = Date.now() - startTimeRef.current;
                setElapsed(Math.floor((accumulatedRef.current + currentSegment) / 1000));
            }
        };

        if (!startTimestamp) {
            startTimeRef.current = Date.now();
        }

        updateTimer();
        const timer = setInterval(updateTimer, 1000);

        return () => {
            clearInterval(timer);
            if (startTimeRef.current !== null) {
                accumulatedRef.current += Date.now() - startTimeRef.current;
                startTimeRef.current = null;
            }
        };
    }, [isActive, startTimestamp]);

    return { elapsed, setElapsed };
};

