import { describe, expect, it } from "vitest";

import { withSpan } from "@/core/observability/tracing";

describe("withSpan", () => {
  it("returns the function result", async () => {
    const value = await withSpan("test.ok", { foo: "bar" }, async () => 42);
    expect(value).toBe(42);
  });

  it("records and rethrows errors", async () => {
    await expect(
      withSpan("test.fail", undefined, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});
