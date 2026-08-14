/**
 * Decide whether to load the OpenTelemetry NodeSDK.
 * Kept free of OTel imports so the preload hook can skip a ~1s module graph.
 */
export function shouldStartObservability(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === "test" || env.VITEST) {
    return false;
  }
  if (env.OTEL_SDK_DISABLED === "true" || env.OTEL_SDK_DISABLED === "1") {
    return false;
  }

  const hasOtlp = Boolean(
    env.OTEL_EXPORTER_OTLP_ENDPOINT || env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  );
  const metricsExplicitlyOn = env.METRICS_ENABLED === "true" || env.METRICS_ENABLED === "1";
  const nodeEnv = env.NODE_ENV || "development";

  // Local default: skip NodeSDK unless traces or metrics are requested.
  if (nodeEnv !== "production" && !hasOtlp && !metricsExplicitlyOn) {
    return false;
  }

  return true;
}
