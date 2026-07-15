import { describe, expect, it } from "vitest";

import { OutgoingPaymentListQuerySchema } from "@/modules/outgoing-payment/outgoing-payment.schema";

describe("OutgoingPaymentListQuerySchema", () => {
  it("applies default page and limit", () => {
    const result = OutgoingPaymentListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("accepts optional filters", () => {
    expect(
      OutgoingPaymentListQuerySchema.safeParse({
        cardCode: "V001",
        dateFrom: "2024-01-01",
        search: "pay",
      }).success,
    ).toBe(true);
  });
});
