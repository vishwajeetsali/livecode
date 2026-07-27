import { useState, useEffect } from "react";

export const useTimer = (isActive = true) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!isActive) return;
        const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
        return () => clearInterval(timer);
    }, [isActive]);

    return { elapsed, setElapsed };
};
