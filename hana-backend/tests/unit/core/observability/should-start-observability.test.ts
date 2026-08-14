import { describe, expect, it } from "vitest";

import { shouldStartObservability } from "@/core/observability/should-start-observability";

describe("shouldStartObservability", () => {
  it("skips the SDK in local development by default", () => {
    expect(shouldStartObservability({ NODE_ENV: "development" })).toBe(false);
  });

  it("skips the SDK in tests", () => {
    expect(shouldStartObservability({ NODE_ENV: "test" })).toBe(false);
    expect(shouldStartObservability({ VITEST: "true" })).toBe(false);
  });

  it("starts in production", () => {
    expect(shouldStartObservability({ NODE_ENV: "production" })).toBe(true);
  });

  it("starts in development when traces or metrics are requested", () => {
    expect(
      shouldStartObservability({
        NODE_ENV: "development",
        OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318",
      }),
    ).toBe(true);
    expect(shouldStartObservability({ NODE_ENV: "development", METRICS_ENABLED: "true" })).toBe(
      true,
    );
  });

  it("honors OTEL_SDK_DISABLED even in production", () => {
    expect(shouldStartObservability({ NODE_ENV: "production", OTEL_SDK_DISABLED: "true" })).toBe(
      false,
    );
  });
});
