import { describe, expect, it } from "vitest";

import { createConfigurationQueries } from "@/modules/intercompany/config/configuration/configuration.queries";
import { createConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import { createBpMappingQueries } from "@/modules/intercompany/config/bp-mapping/bp-mapping.queries";
import { createBpMappingService } from "@/modules/intercompany/config/bp-mapping/bp-mapping.service";
import { createCompanyQueries } from "@/modules/intercompany/config/company/company.queries";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import { createTaxMappingQueries } from "@/modules/intercompany/config/tax-mapping/tax-mapping.queries";
import { createTaxMappingService } from "@/modules/intercompany/config/tax-mapping/tax-mapping.service";
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
import { createAfterPoCreated } from "@/modules/intercompany/api/hooks/after-po-created.hook";
import { createPoCaptureService } from "@/modules/intercompany/flows/flow-2-po-to-ar-draft/01-po-capture/po-capture.service";
import { buildArDraftPayload } from "@/modules/intercompany/flows/flow-2-po-to-ar-draft/02-build-ar-invoice-draft/build-ar-draft.payload";
import { createFlow2Orchestrator } from "@/modules/intercompany/flows/flow-2-po-to-ar-draft/flow-2.orchestrator";
import {
  IC_CONFIG_KEY,
  IC_DOC_MAP_STATUS,
  SAP_OBJECT_TYPE_AR_INVOICE,
} from "@/modules/intercompany/infrastructure/constants";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import { createResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import {
  createMemoryDb,
  createMemorySqlClient,
  seedMemoryCompanyGraph,
} from "@/modules/intercompany/testing/memory-sql";

const enableFlow2 = (db: ReturnType<typeof createMemoryDb>): void => {
  db.tables.IC_CONFIGURATION.push({
    CONFIG_ID: 1,
    CONFIG_KEY: IC_CONFIG_KEY.ENABLE_FLOW2_DIRECT_PO,
    CONFIG_VALUE: "1",
    DESCRIPTION: "test",
  });
};

const createFlow2TestStack = (opts?: {
  enableFlag?: boolean;
  slCreate?: () => Promise<{ docEntry: number; docNum?: number }>;
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
  const taxMapping = createTaxMappingService(createTaxMappingQueries(sql));
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
  };

  const orchestrator = createFlow2Orchestrator({
    configuration,
    documentMap,
    documents,
    history,
    notifications,
    resolvePartner,
    retry,
    taxMapping,
  });

  return {
    db,
    documentMap,
    orchestrator,
    resolvePartner,
    sql,
  };
};

describe("Flow 2 PO → AR Draft (P5)", () => {
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
    expect(result).toMatchObject({ reason: "non_ic_vendor", status: "skipped" });
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

  it("T5.4 build payload tax/customer/remarks", async () => {
    const payload = await buildArDraftPayload({
      buyerCustomerCode: "C-A-ON-B",
      defaultBranchId: 1,
      docDate: "20260315",
      lines: [
        {
          ItemCode: "ITEM1",
          Quantity: 2,
          UnitPrice: 10,
          VatGroup: "IN-12.5",
          WarehouseCode: "01",
        },
      ],
      mapTaxCode: async (code) => (code === "IN-12.5" ? "GSTO" : code),
      remarksTag: "IC-PO-100",
    });

    expect(payload.DocObjectCode).toBe(SAP_OBJECT_TYPE_AR_INVOICE);
    expect(payload.CardCode).toBe("C-A-ON-B");
    expect(payload.Comments).toBe("IC-PO-100");
    expect(payload.NumAtCard).toBe("IC-PO-100");
    expect(payload.BPL_IDAssignedToInvoice).toBe(1);
    expect(payload.DocDate).toBe("2026-03-15");
    expect(payload.DocumentLines).toHaveLength(1);
    expect(payload.DocumentLines[0].VatGroup).toBe("GSTO");
    expect(payload.DocumentLines[0].ItemCode).toBe("ITEM1");
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
      targetObject: IC_OBJECT.AR_DRAFT,
    });

    const result = await stack.orchestrator.run({
      cardCode: "V-B",
      dbName: "DB_A",
      docEntry: 50,
      docNum: 100,
      isDraft: false,
      lines: [{ ItemCode: "X", Quantity: 1, UnitPrice: 1 }],
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

  it("happy path A→B creates map + notifications", async () => {
    const { orchestrator, db } = createFlow2TestStack();

    const result = await orchestrator.run({
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
      remarks: "buyer notes",
    });

    expect(result).toMatchObject({
      status: "success",
      targetDoc: { entry: 9001, num: 501, type: IC_OBJECT.AR_DRAFT },
    });
    expect(db.tables.IC_DOCUMENT_MAPPING).toHaveLength(1);
    expect(db.tables.IC_DOCUMENT_MAPPING[0].STATUS).toBe(IC_DOC_MAP_STATUS.SUCCESS);
    expect(db.tables.IC_DOCUMENT_MAPPING[0].TARGET_DOC_ENTRY).toBe("9001");
    expect(db.tables.IC_NOTIFICATION).toHaveLength(2);
    expect(db.tables.IC_SYNC_HISTORY.length).toBeGreaterThanOrEqual(1);
  });

  it("afterPoCreated never throws (hook wall)", async () => {
    const { orchestrator } = createFlow2TestStack({ enableFlag: false });
    const hook = createAfterPoCreated(orchestrator);
    await expect(
      hook({ cardCode: "V-B", dbName: "DB_A", docEntry: 1, isDraft: false }),
    ).resolves.toMatchObject({ status: "skipped" });
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
