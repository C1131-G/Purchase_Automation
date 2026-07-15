import { describe, expect, it } from "vitest";

import { IncomingPaymentListQuerySchema } from "@/modules/incoming-payment/incoming-payment.schema";

describe("IncomingPaymentListQuerySchema", () => {
  it("applies default page and limit", () => {
    const result = IncomingPaymentListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("accepts optional filters", () => {
    expect(
      IncomingPaymentListQuerySchema.safeParse({
        cardCode: "V001",
        dateFrom: "2024-01-01",
        search: "pay",
      }).success,
    ).toBe(true);
  });
});
