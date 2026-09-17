import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceLayerMock = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@/services/service-layer.service", () => ({
  serviceLayerClient: { request: serviceLayerMock.request },
}));

import { syncBuyerRemarksAfterCreate } from "@/modules/intercompany/infrastructure/service-layer/sync-buyer-remarks";

/**
 * sync-buyer-remarks.test.ts: buyer remarks sync after create — canonical chain patching.
 * Covers: PQ/RFQ/PO ordering, canonical no-op, omitted-comments reload.
 */
// Verifies buyer chain sync patches canonical remark order.
describe("syncBuyerRemarksAfterCreate", () => {
  beforeEach(() => {
    serviceLayerMock.request.mockReset();
  });

  // Verifies SAP-appended chain is patched into canonical order.
  it("patches an SAP-appended buyer chain into PQ, RFQ, PO order", async () => {
    await syncBuyerRemarksAfterCreate({
      createdComments:
        "User note\nBased on RFQ 200\nBased On Purchase Quotations 100\nBased On Purchase Orders 300",
      docEntry: 50,
      endpoint: "/PurchaseDeliveryNotes",
      originalComments: "User note\nBased on RFQ 200",
      sessionId: "session-1",
    });

    expect(serviceLayerMock.request).toHaveBeenCalledWith(
      "session-1",
      "PATCH",
      "/PurchaseDeliveryNotes(50)",
      { Comments: "User note\nPQ No. 100\nRFQ No. 200\nPO No. 300" },
    );
  });

  // Verifies canonical comments skip the PATCH call.
  it("does not patch when comments are already canonical", async () => {
    await syncBuyerRemarksAfterCreate({
      createdComments: "User note\nPQ No. 100\nRFQ No. 200\nPO No. 300",
      docEntry: 50,
      endpoint: "/PurchaseDeliveryNotes",
      originalComments: "User note\nBased on RFQ 200",
      sessionId: "session-1",
    });

    expect(serviceLayerMock.request).not.toHaveBeenCalled();
  });

  // Verifies missing POST comments are reloaded before patching.
  it("loads Comments before patching when SAP POST omits them", async () => {
    serviceLayerMock.request.mockResolvedValueOnce({
      Comments: "Based on RFQ 200\nBased On Purchase Quotations 100",
    });

    await syncBuyerRemarksAfterCreate({
      createdComments: undefined,
      docNum: 300,
      docEntry: 50,
      endpoint: "/PurchaseOrders",
      originalComments: "Based on RFQ 200",
      sessionId: "session-1",
    });

    expect(serviceLayerMock.request).toHaveBeenNthCalledWith(
      1,
      "session-1",
      "GET",
      "/PurchaseOrders(50)?$select=Comments",
    );
    expect(serviceLayerMock.request).toHaveBeenNthCalledWith(
      2,
      "session-1",
      "PATCH",
      "/PurchaseOrders(50)",
      {
        Comments: "PQ No. 100\nRFQ No. 200\nPO No. 300",
      },
    );
  });
});
