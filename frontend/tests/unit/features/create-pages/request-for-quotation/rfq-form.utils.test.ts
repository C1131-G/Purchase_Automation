import { describe, expect, it } from "vitest";

import {
  applyRfqQuotedQtyCap,
  applyRfqSalesTaxToRows,
  buildUpdateRfqLinesPayload,
  buildUpdateRfqLinesPayloadFromProductRows,
  computeRfqProductTotals,
  getRfqBatchQuotedDate,
  getRfqLineFieldErrors,
  canEditRfqLines,
  isRfqCompleted,
  isRfqDraft,
  isRfqReadyToSubmit,
  isRfqSubmitted,
  mapRfqLinesToEditable,
  mapRfqLinesToProductRows,
  normalizeRfqQuotedDate,
} from "@/features/create-pages/request-for-quotation/utils/rfq-form.utils";
import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";
import type { IcRfqLine } from "@/features/intercompany/schemas/intercompany-api.schema";

describe("rfq-form.utils", () => {
  it("normalizes quoted dates to today through Valid Until", () => {
    expect(normalizeRfqQuotedDate("2026-08-01", "2026-08-27", "2026-09-29")).toBe("2026-08-27");
    expect(normalizeRfqQuotedDate("2026-10-01", "2026-08-27", "2026-09-29")).toBe("2026-09-29");
    expect(normalizeRfqQuotedDate("2026-09-15", "2026-08-27", "2026-09-29")).toBe("2026-09-15");
  });

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
    expect(mapped[0]?.taxCode).toBe("VAT");
    expect(mapped[0]?.uomCode).toBe("EA");

    const salesMapped = mapRfqLinesToEditable([{ ...lines[0]!, sqUomCode: "PCS" }]);
    expect(salesMapped[0]?.uomCode).toBe("PCS");
  });

  it("populates product-row vatGroup from seller sqTaxCode and omits tax from PUT", () => {
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
        taxCode: "IN-18",
        sqTaxCode: "OUT-18",
        unitPrice: 20,
        uomCode: "EA",
        warehouse: "01",
      },
    ];

    const rows = mapRfqLinesToProductRows(lines);
    expect(rows[0]?.vatGroup).toBe("OUT-18");
    expect(rows[0]?.taxRate).toBe(0);
    expect(rows[0]?.uomCode).toBe("EA");

    const fallback = mapRfqLinesToProductRows([{ ...lines[0]!, sqTaxCode: null }]);
    expect(fallback[0]?.vatGroup).toBe("IN-18");

    const salesUomRows = mapRfqLinesToProductRows([
      { ...lines[0]!, uomCode: "BOX", sqUomCode: "PCS", sqUomEntry: 7 },
    ]);
    expect(salesUomRows[0]?.uomCode).toBe("PCS");
    expect(salesUomRows[0]?.salesUomCode).toBe("PCS");
    expect(salesUomRows[0]?.uomList).toEqual([{ code: "PCS", name: "PCS", uomEntry: 7 }]);

    const quoted: ProductRow[] = [
      {
        ...rows[0]!,
        price: 20,
        quantity: 10,
        quotedDate: "2026-08-20",
        vatGroup: "OUT-5",
        taxRate: 5,
      },
    ];
    const payload = buildUpdateRfqLinesPayloadFromProductRows(quoted, { requireAllPrices: true });
    expect(payload.errors).toHaveLength(0);
    expect(payload.lines).toHaveLength(1);
    expect(payload.lines[0]).not.toHaveProperty("taxCode");
    expect(payload.lines[0]).not.toHaveProperty("vatGroup");
    expect(payload.lines[0]).not.toHaveProperty("VatGroup");
  });

  it("applies sales tax rate so RFQ tax total is included in grand total", () => {
    const rows = mapRfqLinesToProductRows([
      {
        deliveryDate: "2026-08-20",
        description: "Widget",
        discount: 0,
        itemCode: "A-1",
        lineNum: 1,
        quantity: 10,
        remarks: null,
        rfqId: 1,
        rfqLineId: 9,
        taxCode: "IN-18",
        unitPrice: 20,
        uomCode: "EA",
        warehouse: "01",
      },
    ]);
    const taxed = applyRfqSalesTaxToRows(rows, [
      { category: "I", code: "IN-18", name: "Input 18", rate: 18 },
      { category: "O", code: "OUT-18", name: "Output 18", rate: 18 },
    ]);
    expect(taxed[0]?.vatGroup).toBe("OUT-18");
    expect(taxed[0]?.taxRate).toBe(18);

    const totals = computeRfqProductTotals(taxed);
    expect(totals.netTotal).toBe(200);
    expect(totals.taxTotal).toBe(36);
    expect(totals.grandTotal).toBe(236);
  });

  it("preselects the required date when seller has not entered a quote", () => {
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

    const rows = mapRfqLinesToProductRows(lines, "2026-08-27");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.quantity).toBe(0);
    expect(rows[0]?.quotedDate).toBe("2026-09-15");
    expect(rows[0]?.requiredQuantity).toBe(25);
    expect(rows[0]?.requiredDate).toBe("2026-09-15");
  });

  it("only preselects the RFQ batch date when every row shares a quoted date", () => {
    const rows = [
      { id: "1", quotedDate: "2026-09-15" },
      { id: "2", quotedDate: "2026-09-15" },
    ] as ProductRow[];
    expect(getRfqBatchQuotedDate(rows)).toBe("2026-09-15");

    expect(
      getRfqBatchQuotedDate([rows[0]!, { id: "2", quotedDate: undefined }] as ProductRow[]),
    ).toBe("");
  });

  it("allows partial save and requires all prices on submit", () => {
    const lines = mapRfqLinesToEditable(
      [
        {
          deliveryDate: "2026-08-10",
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
      ],
      "2026-08-27",
    );

    const partial = buildUpdateRfqLinesPayload(lines, { requireAllPrices: false });
    expect(partial.errors).toHaveLength(0);
    expect(partial.lines).toHaveLength(1);
    expect(partial.lines[0]?.unitPrice).toBe(12.5);

    const full = buildUpdateRfqLinesPayload(lines, { requireAllPrices: true });
    expect(full.errors.some((e) => e.includes("Line 1"))).toBe(true);
  });

  it("blocks submit when quoted qty, date, or price are unchanged/empty", () => {
    const emptyRows = mapRfqLinesToProductRows(
      [
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
      ],
      "2026-08-20",
    );

    expect(isRfqReadyToSubmit(emptyRows)).toBe(false);
    const emptySubmit = buildUpdateRfqLinesPayloadFromProductRows(emptyRows, {
      requireAllPrices: true,
    });
    expect(emptySubmit.errors.some((e) => e.includes("unit price"))).toBe(true);
    expect(emptySubmit.lines).toHaveLength(0);

    const missingDateQuote: ProductRow[] = [
      {
        ...emptyRows[0]!,
        price: 10,
        quantity: 5,
        quotedDate: "",
      },
    ];
    expect(isRfqReadyToSubmit(missingDateQuote)).toBe(false);
    const missingDate = buildUpdateRfqLinesPayloadFromProductRows(missingDateQuote, {
      requireAllPrices: true,
    });
    expect(missingDate.errors.some((e) => e.includes("quoted date"))).toBe(true);

    const complete: ProductRow[] = [
      {
        ...emptyRows[0]!,
        price: 10,
        quantity: 5,
        quotedDate: "2026-08-20",
      },
    ];
    expect(isRfqReadyToSubmit(complete)).toBe(true);
    const ok = buildUpdateRfqLinesPayloadFromProductRows(complete, { requireAllPrices: true });
    expect(ok.errors).toHaveLength(0);
    expect(ok.lines).toHaveLength(1);
    expect(ok.lines[0]?.deliveryDate).toBe("2026-08-20");
    expect(ok.lines[0]?.quantity).toBe(5);
    expect(ok.lines[0]?.unitPrice).toBe(10);

    const overRequired: ProductRow[] = [
      {
        ...complete[0]!,
        quantity: 40,
        requiredQuantity: 25,
      },
    ];
    const capped = buildUpdateRfqLinesPayloadFromProductRows(overRequired, {
      requireAllPrices: true,
    });
    expect(capped.errors).toHaveLength(0);
    expect(capped.lines[0]?.quantity).toBe(25);

    expect(
      applyRfqQuotedQtyCap([{ ...complete[0]!, quantity: 99, requiredQuantity: 25 }])[0]?.quantity,
    ).toBe(25);

    const fieldErrorsWithEmptyDate = getRfqLineFieldErrors(missingDateQuote);
    expect(fieldErrorsWithEmptyDate[missingDateQuote[0]!.id]).toEqual({
      quotedDate: true,
    });
    expect(getRfqLineFieldErrors(complete)).toEqual({});
  });

  it("detects draft and submitted statuses", () => {
    expect(isRfqDraft("DRAFT")).toBe(true);
    expect(isRfqDraft("draft")).toBe(true);
    expect(isRfqSubmitted("SUBMITTED")).toBe(true);
    expect(isRfqSubmitted("DRAFT")).toBe(false);
    expect(isRfqCompleted("COMPLETED")).toBe(true);
  });

  it("allows RFQ line edit on DRAFT and COMPLETED until PQ copies to PO", () => {
    expect(canEditRfqLines("DRAFT")).toBe(true);
    expect(canEditRfqLines("SUBMITTED")).toBe(false);
    expect(canEditRfqLines("COMPLETED")).toBe(true);
    expect(canEditRfqLines("COMPLETED", false)).toBe(true);
    expect(canEditRfqLines("COMPLETED", true)).toBe(false);
    expect(canEditRfqLines("CANCELLED")).toBe(false);
  });
});
