import { describe, expect, it } from "vitest";

import { createConfigurationQueries } from "@/modules/intercompany/config/configuration/configuration.queries";
import { createConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import { createBpMappingQueries } from "@/modules/intercompany/config/bp-mapping/bp-mapping.queries";
import { createBpMappingService } from "@/modules/intercompany/config/bp-mapping/bp-mapping.service";
import { createCompanyQueries } from "@/modules/intercompany/config/company/company.queries";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import { createDocumentMapMutations } from "@/modules/intercompany/domain/document-map/document-map.mutations";
import { createDocumentMapQueries } from "@/modules/intercompany/domain/document-map/document-map.queries";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createHistoryMutations } from "@/modules/intercompany/domain/history/history.mutations";
import { createHistoryService } from "@/modules/intercompany/domain/history/history.service";
import { createNotificationMutations } from "@/modules/intercompany/domain/notification/notification.mutations";
import { createNotificationQueries } from "@/modules/intercompany/domain/notification/notification.queries";
import { createNotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import { createRetryMutations } from "@/modules/intercompany/domain/retry/retry.mutations";
import { createRetryQueries } from "@/modules/intercompany/domain/retry/retry.queries";
import { createRetryService } from "@/modules/intercompany/domain/retry/retry.service";
import { createRfqMutations } from "@/modules/intercompany/domain/rfq/rfq.mutations";
import { createRfqQueries } from "@/modules/intercompany/domain/rfq/rfq.queries";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createAfterPoCreated } from "@/modules/intercompany/api/hooks/after-po-created.hook";
import { createPoCaptureService } from "@/modules/intercompany/flows/flow-2-po-to-ar-invoice/01-po-capture/po-capture.service";
import { buildArInvoicePayload } from "@/modules/intercompany/flows/flow-2-po-to-ar-invoice/02-build-ar-invoice/build-ar-invoice.payload";
import { createBuildArInvoiceService } from "@/modules/intercompany/flows/flow-2-po-to-ar-invoice/02-build-ar-invoice/build-ar-invoice.service";
import { createFlow2Orchestrator } from "@/modules/intercompany/flows/flow-2-po-to-ar-invoice/flow-2.orchestrator";
import { IC_CONFIG_KEY, IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import { SAP_OBJ_SALES_QUOTATION } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import { createResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import {
  createMemoryDb,
  createMemorySqlClient,
  seedMemoryCompanyGraph,
} from "@/modules/intercompany/testing/memory-sql";

/** IC remarks line that carries seller SQ DocNum for Flow 2 resolve. */
const remarksWithSq = (sqDocNum = 810): string => `buyer notes\nSQ ${sqDocNum}`;

const enableFlow2 = (db: ReturnType<typeof createMemoryDb>): void => {
  db.tables.IC_CONFIGURATION.push({
    CONFIG_ID: 1,
    CONFIG_KEY: IC_CONFIG_KEY.ENABLE_FLOW2_DIRECT_PO,
    CONFIG_VALUE: "1",
    DESCRIPTION: "test",
  });
};

const defaultSqSnapshot = {
  cardCode: "C-A-ON-B",
  docEntry: 810,
  docNum: 810,
  documentLines: [
    {
      ItemCode: "ITEM1",
      LineNum: 0,
      LineStatus: "bost_Open",
      Quantity: 3,
      RemainingOpenQuantity: 3,
    },
  ],
};

const createFlow2TestStack = (opts?: {
  enableFlag?: boolean;
  slCreate?: () => Promise<{ docEntry: number; docNum?: number }>;
  getSalesQuotation?: () => Promise<typeof defaultSqSnapshot>;
  findSalesQuotationByDocNum?: () => Promise<typeof defaultSqSnapshot | null>;
}) => {
  const db = createMemoryDb();
  seedMemoryCompanyGraph(db);
  if (opts?.enableFlag !== false) {
    enableFlow2(db);
  }
  const sql = createMemorySqlClient(db);

  const company = createCompanyService(createCompanyQueries(sql));
  const bpMapping = createBpMappingService(createBpMappingQueries(sql));
  const resolvePartner = createResolvePartnerService({ bpMapping, company });
  const configuration = createConfigurationService(createConfigurationQueries(sql));
  const documentMap = createDocumentMapService({
    mutations: createDocumentMapMutations(sql),
    queries: createDocumentMapQueries(sql),
  });
  const notifications = createNotificationService({
    mutations: createNotificationMutations(sql),
    queries: createNotificationQueries(sql),
  });
  const history = createHistoryService({
    mutations: createHistoryMutations(sql),
  });
  const retry = createRetryService({
    mutations: createRetryMutations(sql),
    queries: createRetryQueries(sql),
  });

  const documents = {
    applyPricesToPq: async () => {
      throw new Error("not used");
    },
    convertDraftToDocument: async () => {
      throw new Error("not used");
    },
    createArInvoiceDraft:
      opts?.slCreate ??
      (async () => ({
        docEntry: 9001,
        docNum: 501,
      })),
    createSalesQuotation: async () => {
      throw new Error("not used");
    },
    findSalesQuotationByDocNum: opts?.findSalesQuotationByDocNum ?? (async () => defaultSqSnapshot),
    getDraftComments: async () => null,
    getDraftHeaderFields: async () => ({ comments: null, numAtCard: null }),
    getSalesQuotation: opts?.getSalesQuotation ?? (async () => defaultSqSnapshot),
  };

  const warehouseMasters = {
    getFirstActiveBranchWarehouse: async () => ({
      branchId: 1,
      warehouseCode: "WH-TEST",
    }),
    getWarehouseForBranch: async () => "WH-TEST",
    resolveWarehouseIfExists: async () => null,
  };

  const orchestrator = createFlow2Orchestrator({
    build: createBuildArInvoiceService({
      documentMap,
      documents,
      warehouseMasters,
    }),
    configuration,
    documentMap,
    documents,
    history,
    notifications,
    resolvePartner,
    retry,
  });

  return {
    db,
    documentMap,
    documents,
    orchestrator,
    resolvePartner,
    sql,
  };
};

describe("Flow 2 PO → convert seller SQ → AR Invoice", () => {
  it("T5.1 draft PO → skip", async () => {
    const { orchestrator } = createFlow2TestStack();
    const result = await orchestrator.run({
      cardCode: "V-B",
      dbName: "DB_A",
      docEntry: 10,
      isDraft: true,
    });
    expect(result).toEqual({ reason: "draft_po", status: "skipped" });
  });

  it("T5.2 non-IC vendor → skip", async () => {
    const { orchestrator } = createFlow2TestStack();
    const result = await orchestrator.run({
      cardCode: "V-UNKNOWN",
      dbName: "DB_A",
      docEntry: 11,
      isDraft: false,
    });
    expect(result).toMatchObject({ status: "skipped" });
    expect(String((result as { reason?: string }).reason)).toMatch(/^non_ic_vendor/);
  });

  it("T5.3 flag off → skip", async () => {
    const { orchestrator } = createFlow2TestStack({ enableFlag: false });
    const result = await orchestrator.run({
      cardCode: "V-B",
      dbName: "DB_A",
      docEntry: 12,
      isDraft: false,
    });
    expect(result).toMatchObject({ reason: "flow2_disabled", status: "skipped" });
  });

  it("T5.4 build payload is SQ base convert (BaseType 23) + remarks", () => {
    const payload = buildArInvoicePayload({
      buyerCustomerCode: "C-A-ON-B",
      comments: "User note keep me",
      defaultBranchId: 1,
      docDate: "20260315",
      poDocEntry: 100,
      poDocNum: 100,
      pqDocEntry: 55,
      pqDocNum: 2042,
      buyerCompanyName: "AJAX Industries",
      sellerCompanyName: "RCM Trading",
      remarksTag: "IC-PO-100",
      rfqId: 9,
      rfqNumber: "9001",
      sqDocEntry: 810,
      sqDocNum: 810,
      sqLines: [
        {
          ItemCode: "ITEM1",
          LineNum: 0,
          Quantity: 2,
          RemainingOpenQuantity: 2,
        },
      ],
    });

    // Real A/R Invoice body — no DocObjectCode (Drafts only).
    expect(payload.DocObjectCode).toBeUndefined();
    expect(payload.CardCode).toBe("C-A-ON-B");
    // Existing remarks preserved; AR IC chain = PQ + RFQ + SQ (short).
    expect(payload.Comments).toContain("User note keep me");
    expect(payload.Comments).toContain("PQ 2042");
    expect(payload.Comments).toContain("RFQ 9001");
    expect(payload.Comments).toContain("SQ 810");
    expect(payload.Comments).not.toContain("Auto Generated");
    expect(payload.Comments).not.toContain("C-A-ON-B");
    expect(payload.Comments).not.toMatch(/Flow\s*[12]/i);
    // Customer Ref No is not filled with IC-PO auto tags.
    expect(payload.NumAtCard).toBeUndefined();
    expect(payload.BPL_IDAssignedToInvoice).toBe(1);
    expect(payload.DocDate).toBe("2026-03-15");
    expect(payload.DocumentLines).toHaveLength(1);
    // Convert-from SQ — not free-standing ItemCode/VatGroup.
    expect(payload.DocumentLines[0]).toEqual({
      BaseEntry: 810,
      BaseLine: 0,
      BaseType: SAP_OBJ_SALES_QUOTATION,
      Quantity: 2,
    });
    expect(payload.DocumentLines[0].ItemCode).toBeUndefined();
    expect(payload.DocumentLines[0].VatGroup).toBeUndefined();
  });

  it("T5.4b skips closed SQ lines; fails when none open", () => {
    expect(() =>
      buildArInvoicePayload({
        buyerCustomerCode: "C-A-ON-B",
        defaultBranchId: 1,
        poDocEntry: 101,
        remarksTag: "IC-PO-101",
        sqDocEntry: 810,
        sqLines: [
          {
            LineNum: 0,
            LineStatus: "bost_Close",
            Quantity: 1,
          },
        ],
      }),
    ).toThrow(/no open lines/i);
  });

  it("T5.4c service requires seller SQ (no free-standing AR from PO)", async () => {
    const service = createBuildArInvoiceService({
      documents: {
        applyPricesToPq: async () => undefined,
        convertDraftToDocument: async () => ({ docEntry: 1 }),
        createArInvoiceDraft: async () => ({ docEntry: 1 }),
        createSalesQuotation: async () => ({ docEntry: 1 }),
        findSalesQuotationByDocNum: async () => null,
        getDraftComments: async () => null,
        getDraftHeaderFields: async () => ({ comments: null, numAtCard: null }),
        getSalesQuotation: async () => {
          throw new Error("should not load SQ without entry");
        },
      },
      warehouseMasters: {
        getFirstActiveBranchWarehouse: async () => ({
          branchId: 1,
          warehouseCode: "01",
        }),
        getWarehouseForBranch: async () => "01",
        resolveWarehouseIfExists: async () => null,
      },
    });

    const partner = {
      buyerCompany: {
        companyCode: "A",
        companyId: 1,
        companyName: "A",
        defaultBranchId: null,
        isActive: true,
        sapDbName: "DB_A",
      },
      buyerCustomerCode: "C-A-ON-B",
      sellerCompany: {
        companyCode: "B",
        companyId: 2,
        companyName: "B",
        defaultBranchId: 1,
        isActive: true,
        sapDbName: "DB_B",
      },
      vendorCode: "V-B",
      bpMappingId: 1,
    };

    await expect(
      service.build({
        input: {
          cardCode: "V-B",
          docEntry: 200,
          docNum: 200,
          isDraft: false,
          lines: [{ ItemCode: "ITEM1", Quantity: 1, UnitPrice: 9, WarehouseCode: "01" }],
          remarks: "no SQ link here",
        },
        partner,
        remarksTag: "IC-PO-200",
      }),
    ).rejects.toThrow(/Sales Quotation not found/i);
  });

  it("T5.4d service loads SQ and posts BaseType 23 lines", async () => {
    const service = createBuildArInvoiceService({
      documents: {
        applyPricesToPq: async () => undefined,
        convertDraftToDocument: async () => ({ docEntry: 1 }),
        createArInvoiceDraft: async () => ({ docEntry: 1 }),
        createSalesQuotation: async () => ({ docEntry: 1 }),
        findSalesQuotationByDocNum: async () => defaultSqSnapshot,
        getDraftComments: async () => null,
        getDraftHeaderFields: async () => ({ comments: null, numAtCard: null }),
        getSalesQuotation: async () => defaultSqSnapshot,
      },
      warehouseMasters: {
        getFirstActiveBranchWarehouse: async () => ({
          branchId: 1,
          warehouseCode: "01",
        }),
        getWarehouseForBranch: async () => "01",
        resolveWarehouseIfExists: async () => null,
      },
    });

    const partner = {
      buyerCompany: {
        companyCode: "A",
        companyId: 1,
        companyName: "Company A",
        defaultBranchId: null,
        isActive: true,
        sapDbName: "DB_A",
      },
      buyerCustomerCode: "C-A-ON-B",
      sellerCompany: {
        companyCode: "B",
        companyId: 2,
        companyName: "Company B",
        defaultBranchId: 1,
        isActive: true,
        sapDbName: "DB_B",
      },
      vendorCode: "V-B",
      bpMappingId: 1,
    };

    const payload = await service.build({
      input: {
        cardCode: "V-B",
        docEntry: 202,
        docNum: 202,
        isDraft: false,
        lines: [{ ItemCode: "ITEM1", Quantity: 3, UnitPrice: 12, WarehouseCode: "01" }],
        remarks: remarksWithSq(810),
      },
      partner,
      remarksTag: "IC-PO-202",
    });

    expect(payload.DocumentLines).toEqual([
      {
        BaseEntry: 810,
        BaseLine: 0,
        BaseType: SAP_OBJ_SALES_QUOTATION,
        Quantity: 3,
      },
    ]);
    expect(payload.CardCode).toBe("C-A-ON-B");
  });

  it("T5.4e resolves SQ via PQ DocNum remarks + RFQ→SQ map (not DocEntry)", async () => {
    // Production case: PO Comments carry PQ/RFQ DocNum (e.g. 8000603), never SQ line.
    // IC_RFQ stores real PQ DocEntry separately; old lookup treated DocNum as entry and missed.
    const db = createMemoryDb();
    seedMemoryCompanyGraph(db);
    const sql = createMemorySqlClient(db);
    const documentMap = createDocumentMapService({
      mutations: createDocumentMapMutations(sql),
      queries: createDocumentMapQueries(sql),
    });
    const rfq = createRfqService({
      mutations: createRfqMutations(sql),
      queries: createRfqQueries(sql),
    });

    const header = await rfq.createFromDraft({
      createdBy: "test",
      lines: [{ itemCode: "ITEM1", lineNum: 0, quantity: 3 }],
      pqDraftDocEntry: 1234,
      pqDraftDocNum: 8000603,
      rfqNumber: "8000603",
      sourceCompanyId: 1,
      targetCompanyId: 2,
      vendorCode: "V-B",
    });

    await documentMap.create({
      sourceCompanyId: 1,
      sourceDocEntry: String(header.rfqId),
      sourceObject: IC_OBJECT.RFQ,
      status: IC_DOC_MAP_STATUS.SUCCESS,
      targetCompanyId: 2,
      targetDocEntry: "810",
      targetDocNum: "810",
      targetObject: IC_OBJECT.SQ,
    });

    const service = createBuildArInvoiceService({
      documentMap,
      documents: {
        applyPricesToPq: async () => undefined,
        convertDraftToDocument: async () => ({ docEntry: 1 }),
        createArInvoiceDraft: async () => ({ docEntry: 1 }),
        createSalesQuotation: async () => ({ docEntry: 1 }),
        findSalesQuotationByDocNum: async () => null,
        getDraftComments: async () => null,
        getDraftHeaderFields: async () => ({ comments: null, numAtCard: null }),
        getSalesQuotation: async () => defaultSqSnapshot,
      },
      rfq,
      warehouseMasters: {
        getFirstActiveBranchWarehouse: async () => ({
          branchId: 1,
          warehouseCode: "01",
        }),
        getWarehouseForBranch: async () => "01",
        resolveWarehouseIfExists: async () => null,
      },
    });

    const payload = await service.build({
      input: {
        cardCode: "V-B",
        docEntry: 5549,
        docNum: 8001330,
        isDraft: false,
        lines: [{ ItemCode: "ITEM1", Quantity: 3, UnitPrice: 10, WarehouseCode: "01" }],
        remarks:
          "Auto Generated Based on Ajax Spurway Fasteners Pte Ltd Purchase Quotation 8000603\rAuto Generated Based on RC Manubhai & Co. Pte Ltd Request For Quotation 8000603",
      },
      partner: {
        buyerCompany: {
          companyCode: "A",
          companyId: 1,
          companyName: "Ajax Spurway Fasteners Pte Ltd",
          defaultBranchId: null,
          isActive: true,
          sapDbName: "DB_A",
        },
        buyerCustomerCode: "C-A-ON-B",
        sellerCompany: {
          companyCode: "B",
          companyId: 2,
          companyName: "RC Manubhai & Co. Pte Ltd",
          defaultBranchId: 1,
          isActive: true,
          sapDbName: "DB_B",
        },
        vendorCode: "V-B",
        bpMappingId: 1,
      },
      remarksTag: "IC-PO-8001330",
    });

    expect(payload.DocumentLines[0]).toMatchObject({
      BaseEntry: 810,
      BaseType: SAP_OBJ_SALES_QUOTATION,
    });
  });

  it("T5.5 idempotent: existing SUCCESS map → skip create", async () => {
    let slCalls = 0;
    const stack = createFlow2TestStack({
      slCreate: async () => {
        slCalls += 1;
        return { docEntry: 1 };
      },
    });
    await stack.documentMap.create({
      sourceCompanyId: 1,
      sourceDocEntry: "50",
      sourceObject: IC_OBJECT.PO,
      status: IC_DOC_MAP_STATUS.SUCCESS,
      targetCompanyId: 2,
      targetDocEntry: "800",
      targetObject: IC_OBJECT.AR_INVOICE,
    });

    const result = await stack.orchestrator.run({
      cardCode: "V-B",
      dbName: "DB_A",
      docEntry: 50,
      docNum: 100,
      isDraft: false,
      lines: [{ ItemCode: "X", Quantity: 1, UnitPrice: 1 }],
      remarks: remarksWithSq(),
    });

    expect(result.status).toBe("skipped");
    if (result.status === "skipped") {
      expect(result.reason.startsWith("already_mapped_success")).toBe(true);
    }
    expect(slCalls).toBe(0);
    expect(stack.db.tables.IC_DOCUMENT_MAPPING).toHaveLength(1);
  });

  it("T5.6 SL fail → retry enqueued; result queued_retry", async () => {
    const { orchestrator, db } = createFlow2TestStack({
      slCreate: async () => {
        throw new Error("SL down");
      },
    });

    const result = await orchestrator.run({
      cardCode: "V-B",
      dbName: "DB_A",
      docEntry: 77,
      docNum: 177,
      isDraft: false,
      lines: [
        {
          ItemCode: "ITEM1",
          Quantity: 1,
          UnitPrice: 5,
          VatGroup: "IN-12.5",
          WarehouseCode: "01",
        },
      ],
      remarks: remarksWithSq(),
    });

    expect(result.status).toBe("queued_retry");
    if (result.status === "queued_retry") {
      expect(result.retryId).toBeGreaterThan(0);
    }
    expect(db.tables.IC_RETRY_QUEUE).toHaveLength(1);
    expect(db.tables.IC_RETRY_QUEUE[0].STATUS).toBe("WAITING");
    expect(db.tables.IC_DOCUMENT_MAPPING).toHaveLength(1);
    expect(db.tables.IC_DOCUMENT_MAPPING[0].STATUS).toBe(IC_DOC_MAP_STATUS.ERROR);
    expect(db.tables.IC_SYNC_HISTORY.length).toBeGreaterThanOrEqual(1);
  });

  it("happy path A→B converts SQ → AR map + notifications", async () => {
    let postedPayload: Record<string, unknown> | null = null;
    const stack = createFlow2TestStack({
      slCreate: async () => ({ docEntry: 9001, docNum: 501 }),
    });

    const docs = stack.documents as {
      createArInvoiceDraft: (input: {
        companyId: number;
        draftPayload: Record<string, unknown>;
      }) => Promise<{ docEntry: number; docNum?: number }>;
    };
    const originalCreate = docs.createArInvoiceDraft;
    docs.createArInvoiceDraft = async (input) => {
      postedPayload = input.draftPayload;
      return originalCreate(input);
    };

    const result = await stack.orchestrator.run({
      cardCode: "V-B",
      dbName: "DB_A",
      docDate: "2026-03-20",
      docEntry: 88,
      docNum: 188,
      isDraft: false,
      lines: [
        {
          ItemCode: "ITEM1",
          Quantity: 3,
          UnitPrice: 12,
          VatGroup: "IN-12.5",
          WarehouseCode: "01",
        },
      ],
      remarks: remarksWithSq(810),
    });

    expect(result).toMatchObject({
      status: "success",
      targetDoc: { entry: 9001, num: 501, type: IC_OBJECT.AR_INVOICE },
    });
    expect(stack.db.tables.IC_DOCUMENT_MAPPING).toHaveLength(1);
    expect(stack.db.tables.IC_DOCUMENT_MAPPING[0].STATUS).toBe(IC_DOC_MAP_STATUS.SUCCESS);
    expect(stack.db.tables.IC_DOCUMENT_MAPPING[0].TARGET_DOC_ENTRY).toBe("9001");
    expect(stack.db.tables.IC_DOCUMENT_MAPPING[0].TARGET_OBJECT).toBe(IC_OBJECT.AR_INVOICE);
    // Seller only (AR invoice handoff); buyer is not notified on Flow 2 success.
    expect(stack.db.tables.IC_NOTIFICATION).toHaveLength(1);
    expect(stack.db.tables.IC_NOTIFICATION[0].COMPANY_ID).toBe(2);
    expect(stack.db.tables.IC_NOTIFICATION[0].FLOW_STEP).toBe("FLOW2_AR_INVOICE_CREATED");
    expect(stack.db.tables.IC_SYNC_HISTORY.length).toBeGreaterThanOrEqual(1);

    expect(postedPayload).not.toBeNull();
    const lines = postedPayload?.DocumentLines as Record<string, unknown>[];
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      BaseEntry: 810,
      BaseLine: 0,
      BaseType: SAP_OBJ_SALES_QUOTATION,
    });
    expect(lines[0].ItemCode).toBeUndefined();
  });

  it("afterPoCreated never throws (sync path for unit assert)", async () => {
    const { orchestrator } = createFlow2TestStack({ enableFlag: false });
    const hook = createAfterPoCreated(orchestrator, { runInBackground: false });
    await expect(
      hook({ cardCode: "V-B", dbName: "DB_A", docEntry: 1, isDraft: false }),
    ).resolves.toMatchObject({ status: "skipped" });
  });

  it("afterPoCreated default path accepts immediately (IC runs in background)", async () => {
    const { orchestrator } = createFlow2TestStack({ enableFlag: false });
    const hook = createAfterPoCreated(orchestrator);
    await expect(
      hook({ cardCode: "V-B", dbName: "DB_A", docEntry: 1, isDraft: false }),
    ).resolves.toMatchObject({ flow: "flow2", status: "accepted" });
  });

  it("po-capture service draft short-circuit without config I/O when isDraft", async () => {
    const capture = createPoCaptureService({
      configuration: {
        getFlag: async () => {
          throw new Error("should not call");
        },
        getNumber: async () => 0,
        getString: async () => "",
        isFlow1Enabled: async () => false,
        isFlow2Enabled: async () => {
          throw new Error("should not call");
        },
      },
    });
    await expect(
      capture.capture({ cardCode: "V", dbName: "DB", docEntry: 1, isDraft: true }),
    ).resolves.toEqual({ kind: "skip", reason: "draft_po" });
  });
});
