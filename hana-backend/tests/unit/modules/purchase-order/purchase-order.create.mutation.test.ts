import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceLayerRequest = vi.fn();
const serviceLayerGetSession = vi.fn();

vi.mock("@/config/env", () => ({
  config: { serviceLayer: { serviceLayerURL: "https://service-layer.example/b1s/v1" } },
}));

vi.mock("@/core/logger/pino-logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/core/utils/cache", () => ({ purgeCache: vi.fn() }));
vi.mock("@/services/currency-format", () => ({ resolveCurrencyCode: vi.fn() }));
vi.mock("@/services/service-layer.service", () => ({
  serviceLayerClient: {
    getSession: (...args: unknown[]) => serviceLayerGetSession(...args),
    request: (...args: unknown[]) => serviceLayerRequest(...args),
  },
}));
vi.mock("@/modules/attachments/attachments.service", () => ({
  attachmentsService: { createSAPAttachment: vi.fn(), finalizeAndLinkAttachments: vi.fn() },
}));
vi.mock("@/modules/intercompany", () => ({
  afterPoCreated: vi.fn(),
  assertPqLinesCopyAllowed: vi.fn(),
  commentsWithoutSapBaseAutoLines: (comments: unknown) => comments,
  recordIcPqToPoLink: vi.fn(),
}));
vi.mock("@/modules/intercompany/infrastructure/service-layer/sync-buyer-remarks", () => ({
  syncBuyerRemarksAfterCreate: vi.fn(),
}));
vi.mock("@/modules/master-data/document-branch", () => ({
  assignDocumentBranch: vi.fn().mockResolvedValue({ branchId: null }),
}));
vi.mock("@/modules/master-data/document-series", () => ({
  SAP_SERIES_OBJECT: { purchaseOrder: "22" },
  assignDocumentSeries: vi.fn(),
}));

import { createPurchaseOrder } from "@/modules/purchase-order/purchase-order.create.mutation";

describe("createPurchaseOrder", () => {
  beforeEach(() => {
    serviceLayerGetSession.mockReset();
    serviceLayerRequest.mockReset();
    serviceLayerGetSession.mockReturnValue({ companyDB: "AJAX_POS_DB" });
    serviceLayerRequest.mockResolvedValue({ DocEntry: 0, DocNum: 0 });
  });

  it("sends only SAP copy-from fields for an RFQ-based PO line", async () => {
    await createPurchaseOrder(
      "session-1",
      {
        CardCode: "V0134",
        DocDate: "2026-08-22",
        DocumentLines: [
          {
            BaseEntry: 2172,
            BaseLine: 0,
            BaseType: 540000006,
            DiscountPercent: 10,
            ItemCode: "7400000000000",
            Quantity: 1,
            UoMEntry: 1,
            UnitPrice: 10,
            VatGroup: "IN-12.5",
            WarehouseCode: "L101",
          },
        ],
      },
      "AJAX_POS_DB",
      "Portal_Vedha1",
    );

    expect(serviceLayerRequest).toHaveBeenCalledWith(
      "session-1",
      "POST",
      "/PurchaseOrders",
      expect.objectContaining({
        DocumentLines: [{ BaseEntry: 2172, BaseLine: 0, BaseType: 540000006, Quantity: 1 }],
      }),
    );
  });
});
