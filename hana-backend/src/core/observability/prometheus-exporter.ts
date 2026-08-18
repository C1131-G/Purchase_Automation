import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";

import { getPrometheusExporter, setPrometheusExporter } from "./prometheus-runtime";

export function createPrometheusExporter(endpoint = "/metrics"): PrometheusExporter {
  const existing = getPrometheusExporter();
  if (existing instanceof PrometheusExporter) {
    return existing;
  }
  const exporter = new PrometheusExporter({
    preventServerStart: true,
    endpoint,
    withoutScopeInfo: true,
  });
  setPrometheusExporter(exporter);
  return exporter;
}
