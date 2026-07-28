import { describe, expect, it } from "vitest";

import {
  buildUpdateRfqLinesPayload,
  isRfqDraft,
  isRfqSubmitted,
  mapRfqLinesToEditable,
  mapRfqLinesToProductRows,
} from "@/features/create-pages/request-for-quotation/utils/rfq-form.utils";
import type { IcRfqLine } from "@/features/intercompany/schemas/intercompany-api.schema";

describe("rfq-form.utils", () => {
  it("maps API lines to editable drafts", () => {
    const lines: IcRfqLine[] = [
      {
        deliveryDate: "2026-08-01T00:00:00.000Z",
        description: "Widget",
        discount: 5,
        itemCode: "A-1",
        lineNum: 1,
        quantity: 10,
        remarks: null,
        rfqId: 1,
        rfqLineId: 9,
        taxCode: "VAT",
        unitPrice: null,
        uomCode: "EA",
        warehouse: "01",
      },
    ];

    const mapped = mapRfqLinesToEditable(lines);
    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.unitPrice).toBe("");
    expect(mapped[0]?.discount).toBe("5");
    expect(mapped[0]?.deliveryDate).toBe("2026-08-01");
  });

  it("keeps quoted qty/date empty and does not copy required fields", () => {
    const lines: IcRfqLine[] = [
      {
        deliveryDate: null,
        description: "Widget",
        discount: null,
        itemCode: "A-1",
        lineNum: 0,
        quantity: 0,
        remarks: null,
        requiredDate: "2026-09-15",
        requiredQuantity: 25,
        rfqId: 1,
        rfqLineId: 11,
        taxCode: null,
        unitPrice: null,
        uomCode: "EA",
        warehouse: "01",
      },
    ];

    const rows = mapRfqLinesToProductRows(lines);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.quantity).toBe(0);
    expect(rows[0]?.quotedDate).toBeUndefined();
    expect(rows[0]?.requiredQuantity).toBe(25);
    expect(rows[0]?.requiredDate).toBe("2026-09-15");
  });

  it("allows partial save and requires all prices on submit", () => {
    const lines = mapRfqLinesToEditable([
      {
        deliveryDate: null,
        description: null,
        discount: null,
        itemCode: "A",
        lineNum: 0,
        quantity: 1,
        remarks: null,
        rfqId: 1,
        rfqLineId: 1,
        taxCode: null,
        unitPrice: 12.5,
        uomCode: null,
        warehouse: null,
      },
      {
        deliveryDate: null,
        description: null,
        discount: null,
        itemCode: "B",
        lineNum: 1,
        quantity: 2,
        remarks: null,
        rfqId: 1,
        rfqLineId: 2,
        taxCode: null,
        unitPrice: null,
        uomCode: null,
        warehouse: null,
      },
    ]);

    const partial = buildUpdateRfqLinesPayload(lines, { requireAllPrices: false });
    expect(partial.errors).toHaveLength(0);
    expect(partial.lines).toHaveLength(1);
    expect(partial.lines[0]?.unitPrice).toBe(12.5);

    const full = buildUpdateRfqLinesPayload(lines, { requireAllPrices: true });
    expect(full.errors.some((e) => e.includes("Line 1"))).toBe(true);
  });

  it("detects draft and submitted statuses", () => {
    expect(isRfqDraft("DRAFT")).toBe(true);
    expect(isRfqDraft("draft")).toBe(true);
    expect(isRfqSubmitted("SUBMITTED")).toBe(true);
    expect(isRfqSubmitted("DRAFT")).toBe(false);
  });
});
