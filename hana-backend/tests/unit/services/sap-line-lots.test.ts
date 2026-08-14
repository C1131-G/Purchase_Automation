import { describe, expect, it } from "vitest";

import { attachSapLotCollections } from "@/services/sap-line-lots";

describe("attachSapLotCollections", () => {
  it("copies batch and serial collections onto the Service Layer line", () => {
    const docLine: Record<string, unknown> = { ItemCode: "SKU-1" };
    attachSapLotCollections(docLine, {
      BatchNumbers: [{ BatchNumber: "B01", Quantity: 2 }],
      SerialNumbers: [{ InternalSerialNumber: "S1", Quantity: 1 }],
    });
    expect(docLine.BatchNumbers).toEqual([{ BatchNumber: "B01", Quantity: 2 }]);
    expect(docLine.SerialNumbers).toEqual([{ InternalSerialNumber: "S1", Quantity: 1 }]);
  });

  it("copies bin allocations when present", () => {
    const docLine: Record<string, unknown> = { ItemCode: "SKU-1" };
    attachSapLotCollections(docLine, {
      BatchNumbers: [{ BatchNumber: "B01", Quantity: 2 }],
      DocumentLinesBinAllocations: [
        { BinAbsEntry: 12, Quantity: 2, SerialAndBatchNumbersBaseLine: 0 },
      ],
    });
    expect(docLine.DocumentLinesBinAllocations).toEqual([
      { BinAbsEntry: 12, Quantity: 2, SerialAndBatchNumbersBaseLine: 0 },
    ]);
  });

  it("does not add empty collections", () => {
    const docLine: Record<string, unknown> = { ItemCode: "SKU-1" };
    attachSapLotCollections(docLine, { BatchNumbers: [], SerialNumbers: [] });
    expect(docLine.BatchNumbers).toBeUndefined();
    expect(docLine.SerialNumbers).toBeUndefined();
  });
});
