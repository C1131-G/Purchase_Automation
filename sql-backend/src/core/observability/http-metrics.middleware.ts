import type { NextFunction, Request, Response } from "express";

import { routeLabel } from "./attributes";
import { adjustHttpActive, recordHttpRequest } from "./metrics";

const SKIP = new Set(["/metrics"]);

/** RED metrics for HTTP requests (complements OTel HTTP spans). */
export function httpMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const pathOnly = (req.originalUrl || req.url || "").split("?")[0] ?? "";
  if (SKIP.has(pathOnly) || pathOnly.endsWith("/metrics")) {
    next();
    return;
  }

  const start = process.hrtime.bigint();
  adjustHttpActive(req.method, 1);

  res.on("finish", () => {
    adjustHttpActive(req.method, -1);
    const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
    const route = routeLabel(
      req.baseUrl,
      req.route?.path as string | undefined,
      pathOnly || "unmatched",
    );
    recordHttpRequest({
      method: req.method,
      route,
      status_code: res.statusCode,
      durationSec,
    });
  });

  next();
}
