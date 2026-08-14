import { describe, expect, it } from "vitest";

import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";
import {
  addBatchSplitRow,
  compactDateStamp,
  createdQtyForKind,
  GRPO_CREATE_LOT_ACTIONS,
  hasLotKindRows,
  openQtyForKind,
  resolveLotSetupStep,
  resizeBatchAllocations,
  seedBatchAllocations,
  seedSerialAllocations,
  shouldOpenGrpoLotSetup,
  suggestBatchNumber,
  suggestSerialNumber,
} from "@/features/create-pages/create-shared/lot-setup/lot-setup.utils";

const row = (overrides: Partial<ProductRow> = {}): ProductRow => ({
  comment: "",
  currency: "USD",
  discountAmount: 0,
  discountPercent: 0,
  id: "row-1",
  price: 10,
  productCode: "SKU-1",
  productName: "Item",
  quantity: 10,
  stock: 0,
  taxRate: 0,
  vatGroup: "IN-18",
  warehouseCode: "S101",
  ...overrides,
});

describe("lot-setup suggestions", () => {
  it("builds alphanumeric date stamps", () => {
    expect(compactDateStamp("2026-08-14")).toBe("20260814");
    expect(suggestBatchNumber("2026-08-14", 0)).toBe("B20260814001");
    expect(suggestSerialNumber("2026-08-14", 0, 1)).toBe("S20260814001002");
  });
});

describe("batch seed and split", () => {
  it("fills one batch with the full line qty", () => {
    const seeded = seedBatchAllocations(row({ manBtchNum: "Y" }), 0, "2026-08-14");
    expect(seeded).toHaveLength(1);
    expect(seeded[0]?.quantity).toBe(10);
    expect(seeded[0]?.batchNumber).toBe("B20260814001");
  });

  it("keeps existing batch numbers when resizing qty", () => {
    const resized = resizeBatchAllocations(
      [{ batchNumber: "PAINT01", quantity: 10 }],
      12,
      0,
      "2026-08-14",
    );
    expect(resized).toEqual([{ batchNumber: "PAINT01", quantity: 12 }]);
  });

  it("adds an empty split row without changing the original qty", () => {
    const seeded = seedBatchAllocations(row({ manBtchNum: "Y" }), 0, "2026-08-14");
    const split = addBatchSplitRow(seeded, 0, "2026-08-14");
    expect(split).toHaveLength(2);
    expect(split[0]?.quantity).toBe(10);
    expect(split[1]?.quantity).toBe(0);
  });
});

describe("serial seed", () => {
  it("creates one serial per unit", () => {
    const serials = seedSerialAllocations(row({ manSerNum: "Y", quantity: 10 }), 0, "2026-08-14");
    expect(serials).toHaveLength(10);
    expect(serials.every((item) => item.quantity === 1)).toBe(true);
    expect(serials[0]?.internalSerialNumber).toBe("S20260814001001");
    expect(serials[9]?.internalSerialNumber).toBe("S20260814001010");
  });

  it("keeps typed serials when qty shrinks then grows", () => {
    const first = seedSerialAllocations(row({ manSerNum: "Y", quantity: 2 }), 0, "2026-08-14");
    const edited = [{ ...first[0]!, internalSerialNumber: "ABC1" }, first[1]!];
    const grown = seedSerialAllocations(
      row({ manSerNum: "Y", quantity: 3, serialNumbers: edited }),
      0,
      "2026-08-14",
    );
    expect(grown).toHaveLength(3);
    expect(grown[0]?.internalSerialNumber).toBe("ABC1");
  });
});

describe("qty sync totals", () => {
  it("computes created and open qty", () => {
    const batchRow = row({
      manBtchNum: "Y",
      batchNumbers: [{ batchNumber: "B1", quantity: 4 }],
    });
    expect(createdQtyForKind(batchRow, "batches")).toBe(4);
    expect(openQtyForKind(batchRow, "batches")).toBe(6);
  });
});

describe("resolveLotSetupStep", () => {
  it("opens serials first, then batches, then submit", () => {
    const mixed = [
      row({ id: "s", manSerNum: "Y" }),
      row({ id: "b", manBtchNum: "Y" }),
      row({ id: "n", manBtchNum: "N", manSerNum: "N" }),
    ];
    expect(hasLotKindRows(mixed, "serials")).toBe(true);
    expect(hasLotKindRows(mixed, "batches")).toBe(true);
    expect(resolveLotSetupStep(mixed, { batchesConfirmed: false, serialsConfirmed: false })).toBe(
      "serials",
    );
    expect(resolveLotSetupStep(mixed, { batchesConfirmed: false, serialsConfirmed: true })).toBe(
      "batches",
    );
    expect(resolveLotSetupStep(mixed, { batchesConfirmed: true, serialsConfirmed: true })).toBe(
      "submit",
    );
  });

  it("skips a kind that is not on the document", () => {
    expect(
      resolveLotSetupStep([row({ manBtchNum: "Y" })], {
        batchesConfirmed: false,
        serialsConfirmed: false,
      }),
    ).toBe("batches");
  });
});

describe("GRPO create save actions open lot setup", () => {
  it("Save New, View, Close, and Draft trigger lot setup on create only", () => {
    expect(GRPO_CREATE_LOT_ACTIONS).toEqual(["save-new", "view", "close", "draft"]);
    for (const action of GRPO_CREATE_LOT_ACTIONS) {
      expect(shouldOpenGrpoLotSetup(false, action)).toBe(true);
      expect(shouldOpenGrpoLotSetup(true, action)).toBe(false);
    }
    expect(shouldOpenGrpoLotSetup(false, "update")).toBe(false);
    expect(shouldOpenGrpoLotSetup(true, "update")).toBe(false);
  });
});
