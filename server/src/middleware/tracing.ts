/**
 * Express middleware that enriches OpenTelemetry spans with
 * application-specific attributes like request ID, user ID, and route.
 *
 * This bridges the existing X-Request-ID system with OTel distributed tracing.
 */
import type { Request, Response, NextFunction } from "express";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("livecode-api", "1.0.0");

export const tracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const activeSpan = trace.getActiveSpan();

    if (activeSpan) {
        // Correlate with existing request ID system
        const requestId = req.id || req.headers["x-request-id"];
        if (requestId) {
            activeSpan.setAttribute("http.request_id", String(requestId));
        }

        // Add user context if available
        const user = (req as any).user;
        if (user?.userId) {
            activeSpan.setAttribute("user.id", user.userId);
            activeSpan.setAttribute("user.role", user.role || "unknown");
        }

        // Add route pattern for better grouping
        activeSpan.setAttribute("http.route", req.route?.path || req.path);
    }

    // Track response status
    res.on("finish", () => {
        if (activeSpan) {
            activeSpan.setAttribute("http.status_code", res.statusCode);
            if (res.statusCode >= 400) {
                activeSpan.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: `HTTP ${res.statusCode}`,
                });
            }
        }
    });

    next();
};

/**
 * Create a custom span for business logic operations.
 * Usage:
 *   const result = await withSpan("generate-report", { sessionId }, async (span) => {
 *       // ... do work
 *       span.setAttribute("report.score", score);
 *       return result;
 *   });
 */
export async function withSpan<T>(
    name: string,
    attributes: Record<string, string | number | boolean>,
    fn: (span: import("@opentelemetry/api").Span) => Promise<T>
): Promise<T> {
    return tracer.startActiveSpan(name, async (span) => {
        try {
            // Set initial attributes
            for (const [key, value] of Object.entries(attributes)) {
                span.setAttribute(key, value);
            }

            const result = await fn(span);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        } catch (error) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : String(error),
            });
            span.recordException(error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            span.end();
        }
    });
}
