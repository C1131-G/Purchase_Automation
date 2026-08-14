import { describe, expect, it } from "vitest";

import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";
import {
  firstRequiredLotError,
  isAlphanumericLotNumber,
  lotAllocationError,
  lotFieldsFromProduct,
  sanitizeLotNumberInput,
  sapLotFieldsFromRow,
} from "@/features/create-pages/create-shared/utils/product-lot-allocations";

const baseRow = (overrides: Partial<ProductRow> = {}): ProductRow => ({
  comment: "",
  currency: "USD",
  discountAmount: 0,
  discountPercent: 0,
  id: "row-1",
  price: 10,
  productCode: "SKU-1",
  productName: "Item",
  quantity: 2,
  stock: 0,
  taxRate: 0,
  vatGroup: "IN-18",
  warehouseCode: "01",
  ...overrides,
});

describe("lot number alphanumeric", () => {
  it("accepts letters and digits only", () => {
    expect(isAlphanumericLotNumber("BATCH01")).toBe(true);
    expect(isAlphanumericLotNumber("ab12")).toBe(true);
    expect(isAlphanumericLotNumber("B-01")).toBe(false);
    expect(isAlphanumericLotNumber("B 01")).toBe(false);
    expect(sanitizeLotNumberInput("B-01 #x")).toBe("B01x");
    expect(sanitizeLotNumberInput(`B${"1".repeat(40)}`)).toHaveLength(36);
  });
});

describe("lotFieldsFromProduct", () => {
  it("maps Y flags and clears allocations", () => {
    expect(lotFieldsFromProduct({ manBtchNum: "Y", manSerNum: "N" })).toEqual({
      batchNumbers: [],
      manBtchNum: "Y",
      manSerNum: "N",
      serialNumbers: [],
    });
  });
});

describe("lotAllocationError", () => {
  it("requires batches on inventory docs", () => {
    const row = baseRow({ manBtchNum: "Y" });
    expect(lotAllocationError(row, true)).toMatch(/Enter batch numbers/);
    expect(lotAllocationError(row, false)).toBeNull();
  });

  it("rejects non-alphanumeric batch numbers", () => {
    const row = baseRow({
      manBtchNum: "Y",
      batchNumbers: [{ batchNumber: "B-1", quantity: 2 }],
    });
    expect(lotAllocationError(row, true)).toMatch(/alphanumeric/);
  });

  it("requires batch qty to match line qty", () => {
    const row = baseRow({
      manBtchNum: "Y",
      batchNumbers: [{ batchNumber: "B01", quantity: 1 }],
    });
    expect(lotAllocationError(row, true)).toMatch(/must equal line quantity/);
  });

  it("requires serial count to match line qty", () => {
    const row = baseRow({
      manSerNum: "Y",
      serialNumbers: [{ internalSerialNumber: "S1" }],
    });
    expect(lotAllocationError(row, true)).toMatch(/Select 2 serial/);
  });
});

describe("sapLotFieldsFromRow", () => {
  it("maps batches for Service Layer", () => {
    const row = baseRow({
      manBtchNum: "Y",
      batchNumbers: [{ batchNumber: "B01", quantity: 2, expiryDate: "2026-12-31" }],
    });
    expect(sapLotFieldsFromRow(row)).toEqual({
      BatchNumbers: [{ BatchNumber: "B01", ExpiryDate: "2026-12-31", Quantity: 2 }],
    });
  });

  it("maps bin allocations onto the Service Layer line", () => {
    const row = baseRow({
      manBtchNum: "Y",
      batchNumbers: [{ batchNumber: "B01", quantity: 2, binAbsEntry: 12, binCode: "S101-A" }],
    });
    expect(sapLotFieldsFromRow(row).DocumentLinesBinAllocations).toEqual([
      { BinAbsEntry: 12, Quantity: 2, SerialAndBatchNumbersBaseLine: 0 },
    ]);
  });

  it("maps serials for Service Layer", () => {
    const row = baseRow({
      manSerNum: "Y",
      quantity: 1,
      serialNumbers: [{ internalSerialNumber: "S1" }],
    });
    expect(sapLotFieldsFromRow(row)).toEqual({
      SerialNumbers: [{ InternalSerialNumber: "S1", Quantity: 1 }],
    });
  });
});

describe("firstRequiredLotError", () => {
  it("returns the first managed-line error", () => {
    expect(
      firstRequiredLotError([
        baseRow({ manBtchNum: "N" }),
        baseRow({ id: "row-2", manBtchNum: "Y" }),
      ]),
    ).toMatch(/Enter batch numbers/);
  });
});
