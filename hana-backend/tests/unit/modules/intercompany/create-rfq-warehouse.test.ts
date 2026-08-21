import { describe, expect, it, vi } from "vitest";

import { createCreateRfqService } from "@/modules/intercompany/flows/flow-1-pq-rfq-chain/02-create-rfq/create-rfq.service";
import type { CreateRfqFromDraftInput } from "@/modules/intercompany/domain/rfq/rfq.types";
import type { ResolvePartnerResult } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.types";

const partner: ResolvePartnerResult = {
  buyerCompany: {
    companyCode: "AJAX",
    companyId: 1,
    companyName: "Ajax",
    defaultBranchId: 1,
    isActive: true,
    sapDbName: "AJAX_DB",
  },
  buyerCustomerCode: "C-AJAX",
  bpMappingId: 1,
  sellerCompany: {
    companyCode: "RCM",
    companyId: 2,
    companyName: "RCM",
    defaultBranchId: 1,
    isActive: true,
    sapDbName: "RCM_DB",
  },
  vendorCode: "V-RCM",
};

describe("create RFQ warehouse from OSCN", () => {
  it("stores seller OSCN warehouse, not buyer PQ warehouse", async () => {
    const createFromDraft = vi.fn(async (input: CreateRfqFromDraftInput) => ({
      createdBy: null,
      lines: input.lines.map((line, index) => ({
        ...line,
        deliveryDate: line.deliveryDate ?? null,
        description: line.description ?? null,
        discount: line.discount ?? 0,
        rfqId: 9,
        rfqLineId: index + 1,
        taxCode: line.taxCode ?? null,
        unitPrice: line.unitPrice ?? null,
        uomCode: line.uomCode ?? null,
        warehouse: line.warehouse ?? null,
      })),
      pqDraftDocEntry: input.pqDraftDocEntry,
      pqDraftDocNum: input.pqDraftDocNum ?? null,
      remarks: input.remarks ?? null,
      rfqId: 9,
      rfqNumber: input.rfqNumber,
      sourceCompanyId: input.sourceCompanyId,
      status: "DRAFT" as const,
      targetCompanyId: input.targetCompanyId,
      vendorCode: input.vendorCode,
    }));

    const service = createCreateRfqService({
      documentMap: {
        create: async () => ({ mappingId: 44 }),
        findBySource: async () => null,
      } as never,
      mapItems: async () =>
        new Map([
          [
            "BUYER-1",
            {
              description: "Seller item",
              partnerItemCode: "SELLER-1",
              sourceItemCode: "BUYER-1",
              warehouseHint: "Main Store",
            },
          ],
        ]),
      resolveSalesUom: async () => ({ uomCode: "PCS", uomEntry: 1 }),
      resolveWarehouse: async (hint) =>
        hint === "Main Store" ? { branchId: 3, warehouseCode: "WH01" } : null,
      rfq: {
        createFromDraft,
        findBySourceDraft: async () => null,
        getById: async () => null,
      } as never,
    });

    await service.create({
      createdBy: "portal",
      lines: [
        {
          ItemCode: "BUYER-1",
          Quantity: 2,
          WarehouseCode: "PQ-WH",
        },
      ],
      partner,
      remarksTag: "IC|PQ",
      sourceDocEntry: "100",
      sourceDocNum: "240010",
    });

    const stored = createFromDraft.mock.calls[0]?.[0];
    expect(stored?.lines[0]?.itemCode).toBe("SELLER-1");
    expect(stored?.lines[0]?.warehouse).toBe("WH01");
    expect(stored?.lines[0]?.warehouse).not.toBe("PQ-WH");
  });

  it("does not copy PQ warehouse when OSCN warehouse is empty", async () => {
    const createFromDraft = vi.fn(async (input: CreateRfqFromDraftInput) => ({
      createdBy: null,
      lines: input.lines.map((line, index) => ({
        ...line,
        deliveryDate: line.deliveryDate ?? null,
        description: line.description ?? null,
        discount: line.discount ?? 0,
        rfqId: 9,
        rfqLineId: index + 1,
        taxCode: line.taxCode ?? null,
        unitPrice: line.unitPrice ?? null,
        uomCode: line.uomCode ?? null,
        warehouse: line.warehouse ?? null,
      })),
      pqDraftDocEntry: input.pqDraftDocEntry,
      pqDraftDocNum: input.pqDraftDocNum ?? null,
      remarks: input.remarks ?? null,
      rfqId: 9,
      rfqNumber: input.rfqNumber,
      sourceCompanyId: input.sourceCompanyId,
      status: "DRAFT" as const,
      targetCompanyId: input.targetCompanyId,
      vendorCode: input.vendorCode,
    }));

    const service = createCreateRfqService({
      documentMap: {
        create: async () => ({ mappingId: 45 }),
        findBySource: async () => null,
      } as never,
      mapItems: async () =>
        new Map([
          [
            "BUYER-1",
            {
              description: "Seller item",
              partnerItemCode: "SELLER-1",
              sourceItemCode: "BUYER-1",
              warehouseHint: "",
            },
          ],
        ]),
      resolveWarehouse: async () => {
        throw new Error("should not resolve empty hint");
      },
      rfq: {
        createFromDraft,
        findBySourceDraft: async () => null,
        getById: async () => null,
      } as never,
    });

    await service.create({
      lines: [{ ItemCode: "BUYER-1", Quantity: 1, WarehouseCode: "PQ-WH" }],
      partner,
      remarksTag: "IC|PQ",
      sourceDocEntry: "101",
      sourceDocNum: "240011",
    });

    expect(createFromDraft.mock.calls[0]?.[0].lines[0]?.warehouse).toBeNull();
  });
});
