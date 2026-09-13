/**
 * OpenTelemetry Tracing Setup
 *
 * MUST be imported before any other module to ensure all
 * auto-instrumentation hooks are registered first.
 *
 * Usage:
 *   import "./config/tracing.js"; // first line of index.ts
 *
 * Configuration via environment variables:
 *   OTEL_ENABLED=true                          Enable tracing (default: false)
 *   OTEL_SERVICE_NAME=livecode-api             Service name in traces
 *   OTEL_EXPORTER_OTLP_ENDPOINT=http://...     OTLP collector endpoint
 *   OTEL_TRACES_EXPORTER=otlp|console          Export destination
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ConsoleSpanExporter, BatchSpanProcessor, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";

// Only activate when explicitly enabled
const isEnabled = process.env.OTEL_ENABLED === "true";

if (isEnabled) {
    // Optional: Enable OTel diagnostic logging for debugging
    if (process.env.OTEL_DEBUG === "true") {
        diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
    }

    const serviceName = process.env.OTEL_SERVICE_NAME || "livecode-api";
    const exporterType = process.env.OTEL_TRACES_EXPORTER || "console";

    // Build the span exporter
    const spanProcessor = exporterType === "otlp"
        ? new BatchSpanProcessor(
            new OTLPTraceExporter({
                url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces",
            })
        )
        : new SimpleSpanProcessor(new ConsoleSpanExporter());

    const sdk = new NodeSDK({
        resource: {
            attributes: {
                [ATTR_SERVICE_NAME]: serviceName,
                [ATTR_SERVICE_VERSION]: "1.0.0",
                "deployment.environment": process.env.NODE_ENV || "development",
            },
        } as any,
        spanProcessors: [spanProcessor],
        instrumentations: [
            getNodeAutoInstrumentations({
                // Fine-tune auto-instrumentation
                "@opentelemetry/instrumentation-http": {
                    ignoreIncomingRequestHook: (req: any) => {
                        const url = req.url || "";
                        return url === "/api/health" || url === "/favicon.ico";
                    },
                },
                "@opentelemetry/instrumentation-express": {
                    enabled: true,
                },
                "@opentelemetry/instrumentation-fs": {
                    enabled: false, // Too noisy
                },
            }),
        ],
    });

    sdk.start();

    // Graceful shutdown
    const shutdown = async () => {
        try {
            await sdk.shutdown();
            console.log("OpenTelemetry SDK shut down successfully");
        } catch (err) {
            console.error("Error shutting down OpenTelemetry SDK:", err);
        }
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

    console.log(`✅ OpenTelemetry tracing enabled (service: ${serviceName}, exporter: ${exporterType})`);
} else {
    console.log("ℹ️  OpenTelemetry tracing disabled (set OTEL_ENABLED=true to enable)");
}

export {};
