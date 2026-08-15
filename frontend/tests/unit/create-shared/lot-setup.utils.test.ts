import { describe, expect, it } from "vitest";

import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";
import {
  addBatchSplitRow,
  addSerialSplitRow,
  applySerialAutoFill,
  buildSerialAutoFillNumbers,
  compactDateStamp,
  createdQtyForKind,
  GRPO_CREATE_LOT_ACTIONS,
  hasLotKindRows,
  grpoCreateReturnTarget,
  grpoLotDocLabel,
  isGrpoCreateFlowPath,
  lotNumbersPreview,
  lotSetupKindForRow,
  openQtyForKind,
  pickGrpoCreateSearch,
  resolveLotSetupStep,
  rebalanceBatchQuantities,
  resizeBatchAllocations,
  seedBatchAllocations,
  seedSerialAllocations,
  shouldOpenGrpoLotSetup,
  shouldPreserveGrpoCreateDraft,
  suggestBatchNumber,
  suggestSerialNumber,
  normalizeBatchNumberStamp,
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
    expect(suggestBatchNumber("2026-08-14", 0)).toBe("14082026");
    expect(normalizeBatchNumberStamp("20260814", "2026-08-14")).toBe("14082026");
    expect(normalizeBatchNumberStamp("20260814B2", "2026-08-14")).toBe("14082026B2");
    expect(normalizeBatchNumberStamp("PAINT01", "2026-08-14")).toBe("PAINT01");
    expect(suggestSerialNumber("2026-08-14", 0, 1)).toBe("S20260814001002");
  });
});

describe("batch seed and split", () => {
  it("fills one batch with the full line qty", () => {
    const seeded = seedBatchAllocations(row({ manBtchNum: "Y" }), 0, "2026-08-14");
    expect(seeded).toHaveLength(1);
    expect(seeded[0]?.quantity).toBe(10);
    expect(seeded[0]?.batchNumber).toBe("14082026");
  });

  it("keeps existing batch qty when needed grows so the user can split the rest", () => {
    const resized = resizeBatchAllocations(
      [{ batchNumber: "PAINT01", quantity: 10 }],
      12,
      0,
      "2026-08-14",
    );
    expect(resized).toEqual([{ batchNumber: "PAINT01", quantity: 10 }]);
  });

  it("fills remaining qty on a new split batch", () => {
    const seeded = seedBatchAllocations(row({ manBtchNum: "Y" }), 0, "2026-08-14");
    seeded[0] = { ...seeded[0]!, quantity: 6 };
    const split = addBatchSplitRow(seeded, 10, 0, "2026-08-14");
    expect(split).toHaveLength(2);
    expect(split[0]?.quantity).toBe(6);
    expect(split[1]?.quantity).toBe(4);
    expect(split[1]?.batchNumber).toBe("14082026B2");
  });

  it("does not add a split row when the line is already fully allocated", () => {
    const seeded = seedBatchAllocations(row({ manBtchNum: "Y" }), 0, "2026-08-14");
    const split = addBatchSplitRow(seeded, 10, 0, "2026-08-14");
    expect(split).toHaveLength(1);
    expect(split[0]?.quantity).toBe(10);
  });

  it("keeps a reduced batch qty so created can stay below needed", () => {
    const balanced = rebalanceBatchQuantities([{ batchNumber: "14082026", quantity: 5 }], 10, 0);
    expect(balanced).toEqual([{ batchNumber: "14082026", quantity: 5 }]);
  });

  it("does not move leftover onto another batch after a qty edit", () => {
    const balanced = rebalanceBatchQuantities(
      [
        { batchNumber: "14082026", quantity: 5 },
        { batchNumber: "14082026B2", quantity: 0 },
      ],
      10,
      0,
    );
    expect(balanced[0]?.quantity).toBe(5);
    expect(balanced[1]?.quantity).toBe(0);
  });

  it("caps an edited batch so created cannot exceed needed", () => {
    const balanced = rebalanceBatchQuantities([{ batchNumber: "14082026", quantity: 15 }], 10, 0);
    expect(balanced).toEqual([{ batchNumber: "14082026", quantity: 10 }]);
  });
});

describe("serial seed", () => {
  it("creates one empty serial row per unit", () => {
    const serials = seedSerialAllocations(row({ manSerNum: "Y", quantity: 10 }), 0, "2026-08-14");
    expect(serials).toHaveLength(10);
    expect(serials.every((item) => item.quantity === 1)).toBe(true);
    expect(serials.every((item) => item.internalSerialNumber === "")).toBe(true);
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
    expect(grown[1]?.internalSerialNumber).toBe("");
    expect(grown[2]?.internalSerialNumber).toBe("");
  });

  it("auto-fills prefix-number increase like abc-1, abc-2", () => {
    expect(
      buildSerialAutoFillNumbers({
        count: 10,
        direction: "increase",
        parts: [
          { kind: "string", value: "abc" },
          { kind: "number", value: "1" },
        ],
      }),
    ).toEqual([
      "abc-1",
      "abc-2",
      "abc-3",
      "abc-4",
      "abc-5",
      "abc-6",
      "abc-7",
      "abc-8",
      "abc-9",
      "abc-10",
    ]);
  });

  it("auto-fills number decrease, padded start, string-only, and two numbers", () => {
    expect(
      buildSerialAutoFillNumbers({
        count: 3,
        direction: "decrease",
        parts: [
          { kind: "string", value: "abc" },
          { kind: "number", value: "10" },
        ],
      }),
    ).toEqual(["abc-10", "abc-9", "abc-8"]);
    expect(
      buildSerialAutoFillNumbers({
        count: 3,
        direction: "increase",
        parts: [
          { kind: "string", value: "abc" },
          { kind: "number", value: "01" },
        ],
      }),
    ).toEqual(["abc-01", "abc-02", "abc-03"]);
    expect(
      buildSerialAutoFillNumbers({
        count: 3,
        direction: "increase",
        parts: [{ kind: "string", value: "abc" }],
      }),
    ).toEqual(["abc", "abd", "abe"]);
    expect(
      buildSerialAutoFillNumbers({
        count: 3,
        direction: "increase",
        parts: [{ kind: "number", value: "1" }],
      }),
    ).toEqual(["1", "2", "3"]);
    expect(
      buildSerialAutoFillNumbers({
        count: 3,
        direction: "increase",
        parts: [
          { kind: "string", value: "INV" },
          { kind: "number", value: "2026" },
          { kind: "number", value: "1" },
        ],
      }),
    ).toEqual(["INV-2026-1", "INV-2026-2", "INV-2026-3"]);
  });

  it("writes auto-fill numbers onto existing serial rows", () => {
    const serials = seedSerialAllocations(row({ manSerNum: "Y", quantity: 2 }), 0, "2026-08-14");
    const filled = applySerialAutoFill(serials, ["abc-1", "abc-2"]);
    expect(filled.map((item) => item.internalSerialNumber)).toEqual(["abc-1", "abc-2"]);
    expect(filled.every((item) => item.quantity === 1)).toBe(true);
  });

  it("adds one empty serial only when below needed qty", () => {
    const first = seedSerialAllocations(row({ manSerNum: "Y", quantity: 2 }), 0, "2026-08-14");
    expect(addSerialSplitRow(first, 0, "2026-08-14", null, 2)).toHaveLength(2);
    const oneRemoved = first.slice(0, 1);
    const split = addSerialSplitRow(oneRemoved, 0, "2026-08-14", null, 2);
    expect(split).toHaveLength(2);
    expect(split.every((item) => item.quantity === 1)).toBe(true);
    expect(split[1]?.internalSerialNumber).toBe("");
  });
});

describe("qty sync totals", () => {
  it("computes created and open qty", () => {
    const emptyRow = row({ manBtchNum: "Y", batchNumbers: [] });
    const batchRow = row({
      manBtchNum: "Y",
      batchNumbers: [{ batchNumber: "B1", quantity: 4 }],
    });
    expect(createdQtyForKind(emptyRow, "batches")).toBe(0);
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

describe("lot page routing", () => {
  it("sends serial items to serials and batch items to batches", () => {
    expect(lotSetupKindForRow(row({ manSerNum: "Y" }))).toBe("serials");
    expect(lotSetupKindForRow(row({ manBtchNum: "Y" }))).toBe("batches");
  });

  it("keeps the GRPO draft on create path", () => {
    expect(isGrpoCreateFlowPath("/purchase/create-grpo")).toBe(true);
    expect(isGrpoCreateFlowPath("/purchase/create-grpo/")).toBe(true);
    expect(isGrpoCreateFlowPath("/_layout/purchase/create-grpo")).toBe(true);
    expect(isGrpoCreateFlowPath("/purchase/grpo")).toBe(false);
    expect(isGrpoCreateFlowPath("/purchase/create-po")).toBe(false);
  });

  it("returns to the same create-grpo search, not a blank new GRPO", () => {
    expect(
      pickGrpoCreateSearch({
        draftDocNum: "12",
        extra: "drop",
        sourceDocNum: "100",
        sourceDocType: "PurchaseOrder",
      }),
    ).toEqual({
      draftDocNum: "12",
      sourceDocNum: "100",
      sourceDocType: "PurchaseOrder",
    });
    expect(
      grpoCreateReturnTarget({
        search: { sourceDocNum: "55", sourceDocType: "PurchaseQuotation" },
        to: "/purchase/grpo",
      }),
    ).toEqual({
      search: { sourceDocNum: "55", sourceDocType: "PurchaseQuotation" },
      to: "/purchase/create-grpo",
    });
    expect(grpoLotDocLabel({ draftDocNum: "8" })).toBe("8");
    expect(grpoLotDocLabel({})).toBe("New");
  });

  it("shows entered lot numbers on the document row", () => {
    expect(
      lotNumbersPreview(
        row({
          manBtchNum: "Y",
          batchNumbers: [
            { batchNumber: "B1", quantity: 4 },
            { batchNumber: "B2", quantity: 6 },
          ],
        }),
        "batches",
      ),
    ).toBe("B1, B2");
    expect(lotNumbersPreview(row({ manSerNum: "Y", serialNumbers: [] }), "serials")).toBe("");
  });

  it("preserves the draft when returning from lot setup with lines", () => {
    expect(
      shouldPreserveGrpoCreateDraft({
        hasLines: true,
        returnTo: { to: "/purchase/create-grpo" },
      }),
    ).toBe(true);
    expect(
      shouldPreserveGrpoCreateDraft({
        hasLines: true,
        pendingAction: "save-new",
      }),
    ).toBe(true);
    expect(shouldPreserveGrpoCreateDraft({ hasLines: true })).toBe(false);
    expect(
      shouldPreserveGrpoCreateDraft({
        hasLines: false,
        pendingAction: "save-new",
      }),
    ).toBe(false);
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
