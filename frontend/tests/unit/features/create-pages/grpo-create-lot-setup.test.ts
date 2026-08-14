import { describe, expect, it } from "vitest";

import type { GrpoLotPendingAction } from "@/features/create-pages/create-shared/lot-setup/lot-setup.types";
import {
  GRPO_CREATE_LOT_ACTIONS,
  resolveGrpoLotIntercept,
  resolveLotSetupAfterOk,
  seedBatchAllocations,
  seedSerialAllocations,
} from "@/features/create-pages/create-shared/lot-setup/lot-setup.utils";
import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";
import { sapLotFieldsFromRow } from "@/features/create-pages/create-shared/utils/product-lot-allocations";
import { createGRPOLotSessionStoreInstance } from "@/store/create/grpo-lot-session.store";

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

const mixedCreateLines = (): ProductRow[] => [
  row({ id: "serial-1", manSerNum: "Y", productCode: "SER-1", quantity: 2 }),
  row({ id: "batch-1", manBtchNum: "Y", productCode: "BAT-1", quantity: 10 }),
  row({ id: "normal-1", manBtchNum: "N", manSerNum: "N", productCode: "NRM-1" }),
];

const noneConfirmed = { batchesConfirmed: false, serialsConfirmed: false };

describe("GRPO create batch/serial intercept", () => {
  it.each(GRPO_CREATE_LOT_ACTIONS)(
    "create %s opens serials first when the document has serial and batch lines",
    (action) => {
      expect(
        resolveGrpoLotIntercept({
          action,
          confirmed: noneConfirmed,
          isEditMode: false,
          rows: mixedCreateLines(),
        }),
      ).toEqual({ path: "/purchase/grpo-lots/serials", type: "navigate" });
    },
  );

  it.each(GRPO_CREATE_LOT_ACTIONS)(
    "create %s opens batches when only batch lines remain unconfirmed",
    (action) => {
      expect(
        resolveGrpoLotIntercept({
          action,
          confirmed: { batchesConfirmed: false, serialsConfirmed: true },
          isEditMode: false,
          rows: mixedCreateLines(),
        }),
      ).toEqual({ path: "/purchase/grpo-lots/batches", type: "navigate" });
    },
  );

  it.each(GRPO_CREATE_LOT_ACTIONS)("create %s submits after serial and batch OK", (action) => {
    expect(
      resolveGrpoLotIntercept({
        action,
        confirmed: { batchesConfirmed: true, serialsConfirmed: true },
        isEditMode: false,
        rows: mixedCreateLines(),
      }),
    ).toEqual({ type: "submit" });
  });

  it("does not open lot setup on GRPO edit Update", () => {
    expect(
      resolveGrpoLotIntercept({
        action: "update",
        confirmed: noneConfirmed,
        isEditMode: true,
        rows: mixedCreateLines(),
      }),
    ).toEqual({ type: "submit" });
  });

  it("does not open lot setup on edit even if a create action name is passed", () => {
    for (const action of GRPO_CREATE_LOT_ACTIONS) {
      expect(
        resolveGrpoLotIntercept({
          action,
          confirmed: noneConfirmed,
          isEditMode: true,
          rows: mixedCreateLines(),
        }),
      ).toEqual({ type: "submit" });
    }
  });
});

describe("GRPO create lot OK chain", () => {
  it("serial OK then opens batches when a create save action is pending", () => {
    expect(
      resolveLotSetupAfterOk({
        confirmed: noneConfirmed,
        hasPendingCreateAction: true,
        kind: "serials",
        rows: mixedCreateLines(),
      }),
    ).toEqual({ path: "/purchase/grpo-lots/batches", type: "next" });
  });

  it("batch OK continues the original create save", () => {
    expect(
      resolveLotSetupAfterOk({
        confirmed: { batchesConfirmed: false, serialsConfirmed: true },
        hasPendingCreateAction: true,
        kind: "batches",
        rows: mixedCreateLines(),
      }),
    ).toEqual({ type: "continue-submit" });
  });

  it("serial-only create save returns to submit after serial OK", () => {
    expect(
      resolveLotSetupAfterOk({
        confirmed: noneConfirmed,
        hasPendingCreateAction: true,
        kind: "serials",
        rows: [row({ manSerNum: "Y", quantity: 2 })],
      }),
    ).toEqual({ type: "continue-submit" });
  });

  it("row-button visit without a pending save just returns", () => {
    expect(
      resolveLotSetupAfterOk({
        confirmed: noneConfirmed,
        hasPendingCreateAction: false,
        kind: "batches",
        rows: [row({ manBtchNum: "Y" })],
      }),
    ).toEqual({ type: "return" });
  });
});

describe("GRPO create lot session keeps the save action", () => {
  it.each(GRPO_CREATE_LOT_ACTIONS)(
    "stores pending create action %s until OK continue",
    (action) => {
      const store = createGRPOLotSessionStoreInstance();
      store.getState().start({
        docLabel: "New",
        pendingAction: action,
        returnTo: { to: "/purchase/create-grpo" },
      });
      store.getState().confirmSerials();
      store.getState().confirmBatches();
      store.getState().requestContinueSubmit();

      expect(store.getState().pendingAction).toBe(action);
      expect(store.getState().continueSubmit).toBe(true);
      expect(store.getState().serialsConfirmed).toBe(true);
      expect(store.getState().batchesConfirmed).toBe(true);
    },
  );
});

describe("GRPO create lot payload after OK", () => {
  it("sends full-qty batch numbers from the create page seed", () => {
    const line = row({ manBtchNum: "Y", productCode: "BAT-1", quantity: 10 });
    const batchNumbers = seedBatchAllocations(line, 0, "2026-08-14");
    expect(sapLotFieldsFromRow({ ...line, batchNumbers })).toEqual({
      BatchNumbers: [{ BatchNumber: "B20260814001", Quantity: 10 }],
    });
  });

  it("sends one serial per unit from the create page seed", () => {
    const line = row({ manSerNum: "Y", productCode: "SER-1", quantity: 2 });
    const serialNumbers = seedSerialAllocations(line, 0, "2026-08-14");
    expect(sapLotFieldsFromRow({ ...line, serialNumbers })).toEqual({
      SerialNumbers: [
        { InternalSerialNumber: "S20260814001001", Quantity: 1 },
        { InternalSerialNumber: "S20260814001002", Quantity: 1 },
      ],
    });
  });
});

describe("GRPO create lot action set", () => {
  it("lists only Save New, View, Close, and Draft", () => {
    const actions: GrpoLotPendingAction[] = ["save-new", "view", "close", "draft"];
    expect([...GRPO_CREATE_LOT_ACTIONS]).toEqual(actions);
  });
});
