import { describe, expect, it } from "vitest";

import { GRPOQuerySchema } from "@/modules/grpo/grpo.schema";

describe("GRPOQuerySchema", () => {
  it("accepts empty query", () => {
    expect(GRPOQuerySchema.safeParse({}).success).toBe(true);
  });

  it("accepts explicit page and limit", () => {
    const result = GRPOQuerySchema.safeParse({ page: 2, limit: 25 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(25);
    }
  });
});
