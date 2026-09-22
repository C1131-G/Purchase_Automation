import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceLayerRequest = vi.fn();
const serviceLayerGetSession = vi.fn();

vi.mock("@/core/logger/pino-logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/core/utils/cache", () => ({ purgeCache: vi.fn() }));
vi.mock("@/services/service-layer.service", () => ({
  serviceLayerClient: {
    getSession: (...args: unknown[]) => serviceLayerGetSession(...args),
    request: (...args: unknown[]) => serviceLayerRequest(...args),
  },
}));
vi.mock("@/modules/attachments/attachments.service", () => ({
  attachmentsService: { createSAPAttachment: vi.fn(), finalizeAndLinkAttachments: vi.fn() },
}));
vi.mock("@/modules/intercompany", () => ({ assertIcPartnerForCreate: vi.fn() }));
vi.mock("@/modules/master-data/master-data.service", () => ({ resolveItemSalesUom: vi.fn() }));
vi.mock("@/modules/master-data/document-branch", () => ({
  assignDocumentBranch: vi.fn().mockResolvedValue({ branchId: null }),
}));
vi.mock("@/modules/master-data/document-series", () => ({
  SAP_SERIES_OBJECT: { salesQuotation: "23" },
  assignDocumentSeries: vi.fn(),
}));

import { assignDocumentSeries } from "@/modules/master-data/document-series";
import { createSalesQuotation } from "@/modules/sales-quotation/sales-quotation.create.mutation";

describe("createSalesQuotation", () => {
  beforeEach(() => {
    serviceLayerRequest.mockReset();
    serviceLayerGetSession.mockReturnValue({ companyDB: "RCM_DB" });
    serviceLayerRequest.mockResolvedValue({ DocEntry: 1, DocNum: 1 });
    vi.mocked(assignDocumentSeries).mockClear();
  });

  it("picks the numbering series from the first line's warehouse (store location)", async () => {
    await createSalesQuotation(
      "session-1",
      {
        CardCode: "C0001",
        DocDate: "2026-09-22",
        DocumentLines: [
          { ItemCode: "A", Quantity: 1, UoMEntry: 1, UnitPrice: 10, WarehouseCode: "WH-LAB" },
          { ItemCode: "B", Quantity: 1, UoMEntry: 1, UnitPrice: 10, WarehouseCode: "WH-SUV" },
        ],
      },
      "Portal_Vedha1",
    );

    expect(assignDocumentSeries).toHaveBeenCalledWith(
      expect.objectContaining({ objectCode: "23", warehouseCode: "WH-LAB" }),
    );
  });
});
