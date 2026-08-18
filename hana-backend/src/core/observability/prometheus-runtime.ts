import type { IncomingMessage, ServerResponse } from "node:http";

export type PrometheusScrapeHandler = {
  getMetricsRequestHandler: (req: IncomingMessage, res: ServerResponse) => void;
};

let exporter: PrometheusScrapeHandler | null = null;

export const setPrometheusExporter = (next: PrometheusScrapeHandler | null): void => {
  exporter = next;
};

export const getPrometheusExporter = (): PrometheusScrapeHandler | null => exporter;
