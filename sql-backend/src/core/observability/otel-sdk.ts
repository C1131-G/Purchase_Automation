import { DiagConsoleLogger, DiagLogLevel, diag } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  AlwaysOnSampler,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-node";
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

import { initAppMetrics } from "./metrics";
import { createPrometheusExporter } from "./prometheus";

export type ObservabilityOptions = {
  serviceName: string;
  serviceVersion?: string;
  /** Enable pg instrumentation (SQL backend only). */
  includePg?: boolean;
};

let sdk: NodeSDK | null = null;
let started = false;

function envFlag(name: string, defaultTrue = false): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") {
    return defaultTrue;
  }
  return v === "true" || v === "1";
}

function shouldDisable(): boolean {
  if (process.env.NODE_ENV === "test") {
    return true;
  }
  if (envFlag("OTEL_SDK_DISABLED", false)) {
    return true;
  }
  return false;
}

function buildSampler() {
  const nodeEnv = process.env.NODE_ENV || "development";
  if (nodeEnv === "development") {
    return new AlwaysOnSampler();
  }
  const arg = Number(process.env.OTEL_TRACES_SAMPLER_ARG ?? "0.1");
  const ratio = Number.isFinite(arg) ? Math.min(1, Math.max(0, arg)) : 0.1;
  return new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(ratio),
  });
}

/**
 * Start OpenTelemetry SDK (traces + metrics). Idempotent.
 * Must run before Express / pg / http clients are first loaded when possible.
 */
export function startObservability(options: ObservabilityOptions): void {
  if (started || shouldDisable()) {
    return;
  }
  started = true;

  if (process.env.OTEL_DIAG === "true") {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
  }

  const serviceName = process.env.OTEL_SERVICE_NAME || options.serviceName;
  const serviceVersion = process.env.OTEL_SERVICE_VERSION || options.serviceVersion || "0.0.0";
  const environment = process.env.NODE_ENV || "development";

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: environment,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instrumentations: any[] = [
    new HttpInstrumentation({
      ignoreIncomingRequestHook: (req) => {
        const url = req.url ?? "";
        return url.startsWith("/metrics") || url.includes("/metrics");
      },
    }),
    new ExpressInstrumentation(),
  ];

  if (options.includePg) {
    instrumentations.push(
      new PgInstrumentation({
        enhancedDatabaseReporting: false,
      }),
    );
  }

  const metricReaders: ReturnType<typeof createPrometheusExporter>[] = [];
  if (envFlag("METRICS_ENABLED", true)) {
    const path = process.env.METRICS_PATH || "/metrics";
    metricReaders.push(createPrometheusExporter(path));
  }

  const otlpEndpoint =
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "";

  const sdkConfig: ConstructorParameters<typeof NodeSDK>[0] = {
    resource,
    instrumentations,
    sampler: buildSampler(),
    metricReaders: metricReaders.length > 0 ? metricReaders : undefined,
  };

  if (otlpEndpoint) {
    const url = otlpEndpoint.endsWith("/v1/traces")
      ? otlpEndpoint
      : `${otlpEndpoint.replace(/\/$/, "")}/v1/traces`;
    sdkConfig.traceExporter = new OTLPTraceExporter({ url });
  }

  sdk = new NodeSDK(sdkConfig);
  sdk.start();

  if (envFlag("METRICS_ENABLED", true)) {
    initAppMetrics();
  }
}

export async function stopObservability(): Promise<void> {
  if (!sdk) {
    return;
  }
  try {
    await sdk.shutdown();
  } finally {
    sdk = null;
    started = false;
  }
}

export function isObservabilityStarted(): boolean {
  return started;
}
