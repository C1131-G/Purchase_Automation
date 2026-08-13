import { beforeEach, describe, expect, it, vi } from "vitest";

import AppError from "@/core/errors/app-error";

const mocks = vi.hoisted(() => ({
  afterPoUpdated: vi.fn(async () => ({ status: "accepted" })),
  afterPqSaved: vi.fn(async () => ({ status: "accepted" })),
  assertIcPoEditable: vi.fn(async () => undefined),
  assertIcPqEditable: vi.fn(async () => undefined),
  assertIcSqEditable: vi.fn(async () => undefined),
  serviceLayerRequest: vi.fn(async () => undefined),
  syncAttachmentsOnUpdate: vi.fn(async () => ({
    attachmentEntry: 1,
    shouldUpdateDoc: true,
  })),
}));

vi.mock("@/modules/intercompany", () => ({
  afterPoUpdated: mocks.afterPoUpdated,
  afterPqSaved: mocks.afterPqSaved,
  assertIcPoEditable: mocks.assertIcPoEditable,
  assertIcPqEditable: mocks.assertIcPqEditable,
  assertIcSqEditable: mocks.assertIcSqEditable,
}));

vi.mock("@/modules/attachments/attachments.service", () => ({
  attachmentsService: {
    syncAttachmentsOnUpdate: mocks.syncAttachmentsOnUpdate,
  },
}));

vi.mock("@/services/service-layer.service", () => ({
  serviceLayerClient: {
    getSession: () => ({ companyDB: "DB_A" }),
    request: mocks.serviceLayerRequest,
  },
}));

import { updatePurchaseOrder } from "@/modules/purchase-order/purchase-order.update-cancel.mutations";
import { updatePurchaseQuotation } from "@/modules/purchase-quotation/purchase-quotation.update.mutation";
import { updateSalesQuotation } from "@/modules/sales-quotation/sales-quotation.update.mutation";

describe("IC edit preflight ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a locked PQ before attachment synchronization or SAP PATCH", async () => {
    mocks.assertIcPqEditable.mockRejectedValueOnce(
      new AppError("Purchase quotation locked", 409, "IC_PQ_LOCKED"),
    );

    await expect(
      updatePurchaseQuotation("session", "55", { attachments: [{ fileName: "blocked.pdf" }] }),
    ).rejects.toMatchObject({ errorCode: "IC_PQ_LOCKED" });
    expect(mocks.syncAttachmentsOnUpdate).not.toHaveBeenCalled();
    expect(mocks.serviceLayerRequest).not.toHaveBeenCalled();
  });

  it("rejects a locked PO before attachment synchronization or SAP PATCH", async () => {
    mocks.assertIcPoEditable.mockRejectedValueOnce(
      new AppError("Purchase order locked", 409, "IC_PO_LOCKED"),
    );

    await expect(
      updatePurchaseOrder("session", "55", { attachments: [{ fileName: "blocked.pdf" }] }),
    ).rejects.toMatchObject({ errorCode: "IC_PO_LOCKED" });
    expect(mocks.syncAttachmentsOnUpdate).not.toHaveBeenCalled();
    expect(mocks.serviceLayerRequest).not.toHaveBeenCalled();
  });

  it("rejects an IC SQ before attachment synchronization or SAP PATCH", async () => {
    mocks.assertIcSqEditable.mockRejectedValueOnce(
      new AppError("Sales quotation locked", 409, "IC_SQ_LOCKED"),
    );

    await expect(
      updateSalesQuotation("session", "88", { attachments: [{ fileName: "blocked.pdf" }] }),
    ).rejects.toMatchObject({ errorCode: "IC_SQ_LOCKED" });
    expect(mocks.syncAttachmentsOnUpdate).not.toHaveBeenCalled();
    expect(mocks.serviceLayerRequest).not.toHaveBeenCalled();
  });
});
