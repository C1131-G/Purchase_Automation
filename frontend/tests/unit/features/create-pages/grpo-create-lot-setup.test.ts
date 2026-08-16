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
      ).toEqual({ kind: "serials", rowId: "serial-1", type: "open-modal" });
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
      ).toEqual({ kind: "batches", rowId: "batch-1", type: "open-modal" });
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

  it("opens lot setup on GRPO edit when batch or serial numbers are missing", () => {
    expect(
      resolveGrpoLotIntercept({
        action: "update",
        confirmed: noneConfirmed,
        isEditMode: true,
        rows: mixedCreateLines(),
      }),
    ).toEqual({ kind: "serials", rowId: "serial-1", type: "open-modal" });
  });

  it("submits GRPO edit Update when existing lots are already valid", () => {
    expect(
      resolveGrpoLotIntercept({
        action: "update",
        confirmed: noneConfirmed,
        isEditMode: true,
        rows: [
          row({
            id: "serial-1",
            manSerNum: "Y",
            productCode: "SER-1",
            quantity: 2,
            serialNumbers: [
              { internalSerialNumber: "SN-1", quantity: 1 },
              { internalSerialNumber: "SN-2", quantity: 1 },
            ],
          }),
          row({
            id: "batch-1",
            manBtchNum: "Y",
            productCode: "BAT-1",
            quantity: 10,
            batchNumbers: [{ batchNumber: "14082026", quantity: 10 }],
          }),
        ],
      }),
    ).toEqual({ type: "submit" });
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
    ).toEqual({ kind: "batches", type: "next" });
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

  it("keeps create-page vendor chrome when opening lots from a row click then save", () => {
    const store = createGRPOLotSessionStoreInstance();
    store.getState().setChrome({
      attachments: [],
      billToAddress: "Bill",
      buyerInput: "Buyer",
      shipToAddress: "Ship",
      vendorCode: "V001",
      vendorName: "Vendor",
      warehouseInput: "S101",
    });
    store.getState().setReturnTo({ to: "/purchase/create-grpo" });
    store.getState().start({
      docLabel: "New",
      pendingAction: "save-new",
      returnTo: { search: { sourceDocNum: "100" }, to: "/purchase/create-grpo" },
    });

    expect(store.getState().chrome?.vendorCode).toBe("V001");
    expect(store.getState().chrome?.vendorName).toBe("Vendor");
    expect(store.getState().pendingAction).toBe("save-new");
  });
});

describe("GRPO create lot payload after OK", () => {
  it("sends full-qty batch numbers from the create page seed", () => {
    const line = row({ manBtchNum: "Y", productCode: "BAT-1", quantity: 10 });
    const batchNumbers = seedBatchAllocations(line, 0, "2026-08-14");
    expect(sapLotFieldsFromRow({ ...line, batchNumbers })).toEqual({
      BatchNumbers: [{ BatchNumber: "14082026", Quantity: 10 }],
    });
  });

  it("seeds empty serial rows and only sends numbers the user entered", () => {
    const line = row({ manSerNum: "Y", productCode: "SER-1", quantity: 2 });
    const serialNumbers = seedSerialAllocations(line, 0, "2026-08-14");
    expect(serialNumbers).toEqual([
      { internalSerialNumber: "", quantity: 1 },
      { internalSerialNumber: "", quantity: 1 },
    ]);
    expect(sapLotFieldsFromRow({ ...line, serialNumbers })).toEqual({
      SerialNumbers: [
        { InternalSerialNumber: "", Quantity: 1 },
        { InternalSerialNumber: "", Quantity: 1 },
      ],
    });
    const filled = [
      { ...serialNumbers[0]!, internalSerialNumber: "SN-A" },
      { ...serialNumbers[1]!, internalSerialNumber: "SN-B" },
    ];
    expect(sapLotFieldsFromRow({ ...line, serialNumbers: filled })).toEqual({
      SerialNumbers: [
        { InternalSerialNumber: "SN-A", Quantity: 1 },
        { InternalSerialNumber: "SN-B", Quantity: 1 },
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
