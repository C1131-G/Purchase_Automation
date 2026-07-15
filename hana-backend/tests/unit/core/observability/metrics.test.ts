import { describe, expect, it } from "vitest";

import {
  isMetricsEnabled,
  recordAppError,
  recordAuthLogin,
  recordHttpRequest,
  recordSapSlRequest,
} from "@/core/observability/metrics";

describe("metrics (disabled by default in tests)", () => {
  it("is not enabled when SDK did not start", () => {
    expect(isMetricsEnabled()).toBe(false);
  });

  it("record helpers are no-ops when disabled", () => {
    expect(() => {
      recordHttpRequest({
        method: "GET",
        route: "/api/v1/health",
        status_code: 200,
        durationSec: 0.01,
      });
      recordAppError("UNKNOWN_ERROR", 500);
      recordAuthLogin("fail");
      recordSapSlRequest("GET", "Orders", "200", 0.05);
    }).not.toThrow();
  });
});
