type LogLevel = "info" | "warn" | "error" | "debug";

interface LogPayload {
    message: string;
    level: LogLevel;
    timestamp: string;
    requestId?: string;
    [key: string]: any;
}

const formatLog = (level: LogLevel, message: string, meta: Record<string, any> = {}): LogPayload => {
    return {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...meta,
    };
};

export const logger = {
    info: (message: string, meta?: Record<string, any>) => {
        console.log(JSON.stringify(formatLog("info", message, meta)));
    },
    warn: (message: string, meta?: Record<string, any>) => {
        console.warn(JSON.stringify(formatLog("warn", message, meta)));
    },
    error: (message: string, meta?: Record<string, any>) => {
        console.error(JSON.stringify(formatLog("error", message, meta)));
    },
    debug: (message: string, meta?: Record<string, any>) => {
        if (process.env.NODE_ENV !== "production") {
            console.debug(JSON.stringify(formatLog("debug", message, meta)));
        }
    },
};
