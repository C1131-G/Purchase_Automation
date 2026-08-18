import type { IncomingMessage, ServerResponse } from "node:http";

import type { RequestHandler } from "express";

import { getPrometheusExporter } from "./prometheus-runtime";

export { getPrometheusExporter } from "./prometheus-runtime";

/**
 * Express handler that scrapes the in-process Prometheus exporter.
 * Optional bearer token: set METRICS_BEARER_TOKEN to require Authorization: Bearer …
 */
export function createMetricsHandler(options: {
  path: string;
  bearerToken?: string;
}): RequestHandler {
  return (req, res) => {
    if (options.bearerToken) {
      const header = req.headers.authorization ?? "";
      const expected = `Bearer ${options.bearerToken}`;
      if (header !== expected) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
    }

    const prom = getPrometheusExporter();
    if (!prom) {
      res.status(503).type("text/plain").send("metrics unavailable\n");
      return;
    }

    // OTel handler expects Node IncomingMessage/ServerResponse; Express is compatible.
    prom.getMetricsRequestHandler(req as IncomingMessage, res as ServerResponse);
  };
}
