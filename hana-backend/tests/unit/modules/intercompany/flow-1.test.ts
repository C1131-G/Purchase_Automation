import { describe, expect, it } from "vitest";

import { createAfterPqDraftSaved } from "@/modules/intercompany/api/hooks/after-pq-draft-saved.hook";
import { createConfigurationQueries } from "@/modules/intercompany/config/configuration/configuration.queries";
import { createConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import { createBpMappingQueries } from "@/modules/intercompany/config/bp-mapping/bp-mapping.queries";
import { createBpMappingService } from "@/modules/intercompany/config/bp-mapping/bp-mapping.service";
import { createCompanyQueries } from "@/modules/intercompany/config/company/company.queries";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import { createPartnerTaxResolver } from "@/modules/intercompany/config/tax-mapping/resolve-partner-tax.service";
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
import { createSellerFillRfqService } from "@/modules/intercompany/flows/flow-1-pq-draft-rfq-chain/04-seller-fill-rfq/seller-fill-rfq.service";
import { buildRfqCommercialDocumentLines } from "@/modules/intercompany/flows/flow-1-pq-draft-rfq-chain/05-convert-pq-and-sq/apply-prices-to-draft";
import { createConvertPqAndSqService } from "@/modules/intercompany/flows/flow-1-pq-draft-rfq-chain/05-convert-pq-and-sq/convert-pq-and-sq.service";
import { createFlow1Orchestrator } from "@/modules/intercompany/flows/flow-1-pq-draft-rfq-chain/flow-1.orchestrator";
import { sanitizeFillLines } from "@/modules/intercompany/flows/flow-1-pq-draft-rfq-chain/04-seller-fill-rfq/update-rfq-lines";
import { mergeDocumentLinesByLineNum } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import {
  IC_CONFIG_KEY,
  IC_DOC_MAP_STATUS,
  IC_RFQ_STATUS,
} from "@/modules/intercompany/infrastructure/constants";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import { createResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import {
  createMemoryDb,
  createMemorySqlClient,
  seedMemoryCompanyGraph,
} from "@/modules/intercompany/testing/memory-sql";

const enableFlow1 = (db: ReturnType<typeof createMemoryDb>): void => {
  db.tables.IC_CONFIGURATION.push({
    CONFIG_ID: 1,
    CONFIG_KEY: IC_CONFIG_KEY.ENABLE_FLOW1_RFQ_CHAIN,
    CONFIG_VALUE: "1",
    DESCRIPTION: "test",
  });
};

const createFlow1TestStack = (opts?: {
  enableFlag?: boolean;
  documents?: Partial<IcSlDocuments>;
}) => {
  const db = createMemoryDb();
  seedMemoryCompanyGraph(db);
  if (opts?.enableFlag !== false) {
    enableFlow1(db);
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
  const rfq = createRfqService({
    mutations: createRfqMutations(sql),
    queries: createRfqQueries(sql),
  });

  const documents: IcSlDocuments = {
    applyPricesToDraft: opts?.documents?.applyPricesToDraft ?? (async () => undefined),
    convertDraftToDocument:
      opts?.documents?.convertDraftToDocument ??
      (async () => ({
        docEntry: 7001,
        docNum: 701,
      })),
    createArInvoiceDraft: async () => {
      throw new Error("not used in flow1");
    },
    createSalesQuotation:
      opts?.documents?.createSalesQuotation ??
      (async () => ({
        docEntry: 8001,
        docNum: 801,
      })),
    getDraftComments: opts?.documents?.getDraftComments ?? (async () => null),
  };

  const orchestrator = createFlow1Orchestrator({
    configuration,
    documentMap,
    history,
    notifications,
    resolvePartner,
    rfq,
  });

  const fill = createSellerFillRfqService({
    notify: undefined,
    rfq,
  });

  const fillWithNotify = createSellerFillRfqService({
    rfq,
  });

  // Rebuild fill with notify that uses memory notifications
  const fillService = createSellerFillRfqService({
    notify: {
      notifyRfqCreated: async () => undefined,
      notifyRfqSubmitted: async (params) => {
        await notifications.create({
          companyId: params.rfq.sourceCompanyId,
          documentId: String(params.rfq.rfqId),
          documentType: IC_OBJECT.RFQ,
          flowStep: "FLOW1_RFQ_SUBMITTED",
          title: `RFQ submitted ${params.rfq.rfqNumber}`,
        });
      },
    },
    rfq,
  });

  const convert = createConvertPqAndSqService({
    bpMapping,
    company,
    configuration,
    documentMap,
    documents,
    history,
    partnerTax: createPartnerTaxResolver({
      company,
      masters: {
        getBpTax: async () => null,
        getItemTax: async () => null,
      },
    }),
    // Avoid live OWHS tenant lookup in unit tests (multi-branch SQ WH).
    warehouseMasters: {
      getItemWarehouseOnBranch: async () => null,
      getWarehouseForBranch: async () => "WH-TEST",
    },
    retry,
    rfq,
  });

  // Rebuild fill with convert so submit auto-runs draft→PQ + SQ (production path).
  const fillWithConvert = createSellerFillRfqService({
    convert,
    notify: {
      notifyRfqCreated: async () => undefined,
      notifyRfqSubmitted: async (params) => {
        await notifications.create({
          companyId: params.rfq.sourceCompanyId,
          documentId: String(params.rfq.rfqId),
          documentType: IC_OBJECT.RFQ,
          flowStep: "FLOW1_RFQ_SUBMITTED",
          title: `RFQ submitted ${params.rfq.rfqNumber}`,
        });
      },
    },
    rfq,
  });

  void fill;
  void fillWithNotify;
  void fillService;

  return {
    convert,
    db,
    documentMap,
    fill: fillWithConvert,
    notifications,
    orchestrator,
    resolvePartner,
    rfq,
    sql,
  };
};

describe("Flow 1 PQ Draft → RFQ chain (P6)", () => {
  it("T6.1 non-IC vendor → skip", async () => {
    const { orchestrator } = createFlow1TestStack();
    const result = await orchestrator.run({
      cardCode: "V-UNKNOWN",
      dbName: "DB_A",
      docEntry: 11,
      lines: [{ ItemCode: "X", Quantity: 1 }],
    });
    expect(result).toMatchObject({ status: "skipped" });
    expect(String((result as { reason?: string }).reason)).toMatch(/^non_ic_vendor/);
  });

  it("T6.1b flag off → skip", async () => {
    const { orchestrator } = createFlow1TestStack({ enableFlag: false });
    const result = await orchestrator.run({
      cardCode: "V-B",
      dbName: "DB_A",
      docEntry: 12,
    });
    expect(result).toMatchObject({ reason: "flow1_disabled", status: "skipped" });
  });

  it("T6.2 create RFQ idempotent per draft", async () => {
    const { orchestrator, db, rfq } = createFlow1TestStack();
    const input = {
      cardCode: "V-B",
      dbName: "DB_A",
      docEntry: 55,
      docNum: 9001,
      lines: [
        { ItemCode: "ITEM1", LineNum: 0, Quantity: 2, UnitPrice: 10 },
        { ItemCode: "ITEM2", LineNum: 1, Quantity: 5, UnitPrice: 3 },
      ],
    };

    const first = await orchestrator.run(input);
    expect(first.status).toBe("success");
    if (first.status === "success") {
      expect(first.targetDoc?.type).toBe(IC_OBJECT.RFQ);
      expect(first.targetDoc?.entry).toBeGreaterThan(0);
    }
    expect(db.tables.IC_RFQ_HEADER).toHaveLength(1);
    expect(db.tables.IC_RFQ_LINE).toHaveLength(2);
    expect(db.tables.IC_DOCUMENT_MAPPING).toHaveLength(1);
    expect(db.tables.IC_DOCUMENT_MAPPING[0].STATUS).toBe(IC_DOC_MAP_STATUS.SUCCESS);
    expect(db.tables.IC_NOTIFICATION.length).toBeGreaterThanOrEqual(1);

    // Auto IC remarks stored on RFQ at create (doc type + number only).
    const storedRemarks = String(db.tables.IC_RFQ_HEADER[0].REMARKS ?? "");
    expect(storedRemarks).toContain("IC | PQD: PQ Draft No 9001");
    expect(storedRemarks).toContain("IC | RFQ: RFQ-PQD-9001");
    expect(storedRemarks).not.toMatch(/Flow\s*[12]/i);

    const second = await orchestrator.run(input);
    expect(second.status).toBe("skipped");
    if (second.status === "skipped") {
      expect(second.reason.startsWith("already_rfq_exists")).toBe(true);
    }
    expect(db.tables.IC_RFQ_HEADER).toHaveLength(1);

    const header = await rfq.findBySourceDraft(1, 55);
    expect(header?.rfqNumber).toContain("9001");
  });

  it("T6.3 fill rejects item change but allows quoted qty", () => {
    expect(() =>
      sanitizeFillLines([{ itemCode: "HACK", lineNum: 0, quantity: 99, unitPrice: 1 }]),
    ).toThrow(/not item/i);

    const ok = sanitizeFillLines([
      { deliveryDate: "2026-04-01", discount: 5, lineNum: 0, quantity: 3, unitPrice: 12.5 },
    ]);
    expect(ok).toEqual([
      {
        deliveryDate: "2026-04-01",
        discount: 5,
        lineNum: 0,
        quantity: 3,
        unitPrice: 12.5,
      },
    ]);
  });

  it("T6.4 submit → status + notification", async () => {
    const { orchestrator, fill, rfq, db } = createFlow1TestStack();
    await orchestrator.run({
      cardCode: "V-B",
      dbName: "DB_A",
      docEntry: 60,
      docNum: 60,
      lines: [{ ItemCode: "ITEM1", LineNum: 0, Quantity: 1, UnitPrice: 0 }],
    });

    const header = await rfq.findBySourceDraft(1, 60);
    expect(header).toBeTruthy();
    const rfqId = header!.rfqId;

    await fill.updateLines({
      actorCompanyId: 2,
      lines: [{ lineNum: 0, unitPrice: 25, deliveryDate: "2026-05-01" }],
      rfqId,
    });

    const submitted = await fill.submit({ actorCompanyId: 2, rfqId });
    // Submit auto-converts (draft→PQ + SQ); RFQ becomes COMPLETED on success.
    expect(submitted.status).toBe(IC_RFQ_STATUS.COMPLETED);
    expect(db.tables.IC_NOTIFICATION.some((row) => row.FLOW_STEP === "FLOW1_RFQ_SUBMITTED")).toBe(
      true,
    );
    expect(db.tables.IC_DOCUMENT_MAPPING.some((row) => row.TARGET_OBJECT === IC_OBJECT.SQ)).toBe(
      true,
    );
  });

  it("T6.5 convert success path with mocked SL", async () => {
    let applied = false;
    let converted = false;
    let sqCreated = false;
    let appliedLines: Record<string, unknown>[] = [];
    let convertOverrides: Record<string, unknown>[] | undefined;

    const { orchestrator, fill, convert, db } = createFlow1TestStack({
      documents: {
        applyPricesToDraft: async (input) => {
          applied = true;
          appliedLines = input.documentLines;
        },
        convertDraftToDocument: async (input) => {
          converted = true;
          convertOverrides = input.lineOverrides;
          return { docEntry: 7100, docNum: 710 };
        },
        createSalesQuotation: async () => {
          sqCreated = true;
          return { docEntry: 8100, docNum: 810 };
        },
      },
    });

    await orchestrator.run({
      cardCode: "V-B",
      dbName: "DB_A",
      docEntry: 70,
      docNum: 70,
      lines: [
        {
          DiscountPercent: 5,
          ItemCode: "ITEM1",
          LineNum: 0,
          Quantity: 2,
          UnitPrice: 1,
          VatGroup: "IN-12.5",
        },
      ],
    });

    const rfqId = Number(db.tables.IC_RFQ_HEADER[0].RFQ_ID);
    await fill.updateLines({
      actorCompanyId: 2,
      lines: [{ discount: 10, lineNum: 0, quantity: 3, unitPrice: 40 }],
      rfqId,
    });
    // Submit auto-runs convert (no separate buyer convert click).
    await fill.submit({ actorCompanyId: 2, rfqId });

    const result = await convert.convert({ actorCompanyId: 1, rfqId });
    expect(result.status).toBe("success");
    expect(applied).toBe(true);
    expect(converted).toBe(true);
    expect(sqCreated).toBe(true);
    // Seller-filled qty/price/disc% (+ tax from RFQ snapshot) must reach SL.
    expect(appliedLines[0]).toMatchObject({
      DiscountPercent: 10,
      ItemCode: "ITEM1",
      Quantity: 3,
      UnitPrice: 40,
      VatGroup: "IN-12.5",
    });
    expect(convertOverrides?.[0]).toMatchObject({
      DiscountPercent: 10,
      Quantity: 3,
      UnitPrice: 40,
      VatGroup: "IN-12.5",
    });
    expect(db.tables.IC_RFQ_HEADER[0].STATUS).toBe(IC_RFQ_STATUS.COMPLETED);
    expect(db.tables.IC_DOCUMENT_MAPPING.some((row) => row.TARGET_OBJECT === IC_OBJECT.SQ)).toBe(
      true,
    );
  });

  it("T6.5b commercial line map + merge keeps tax/qty/price/disc", () => {
    const built = buildRfqCommercialDocumentLines([
      {
        deliveryDate: "2026-06-01",
        description: "Widget",
        discount: 12.5,
        itemCode: "W1",
        lineNum: 0,
        quantity: 4,
        remarks: null,
        requiredQuantity: 5,
        rfqId: 1,
        rfqLineId: 1,
        taxCode: "IN-12.5",
        unitPrice: 100,
        uomCode: "NOS",
        warehouse: "WH01",
      },
    ]);
    expect(built[0]).toMatchObject({
      DiscountPercent: 12.5,
      ItemCode: "W1",
      Quantity: 4,
      RequiredQuantity: 5,
      UnitPrice: 100,
      VatGroup: "IN-12.5",
      WarehouseCode: "WH01",
    });

    const merged = mergeDocumentLinesByLineNum(
      [
        {
          ItemCode: "W1",
          LineNum: 0,
          Quantity: 1,
          UnitPrice: 0,
          VatGroup: "OLD-TAX",
          WarehouseCode: "WH01",
        },
      ],
      built,
    );
    expect(merged[0]).toMatchObject({
      DiscountPercent: 12.5,
      Quantity: 4,
      UnitPrice: 100,
      VatGroup: "IN-12.5",
      WarehouseCode: "WH01",
    });
  });

  it("T6.6 SQ fail → retry enqueue; RFQ stays SUBMITTED", async () => {
    const { orchestrator, fill, db } = createFlow1TestStack({
      documents: {
        createSalesQuotation: async () => {
          throw new Error("SL SQ down");
        },
      },
    });

    await orchestrator.run({
      cardCode: "V-B",
      dbName: "DB_A",
      docEntry: 80,
      lines: [{ ItemCode: "ITEM1", LineNum: 0, Quantity: 1 }],
    });
    const rfqId = Number(db.tables.IC_RFQ_HEADER[0].RFQ_ID);
    await fill.updateLines({
      actorCompanyId: 2,
      lines: [{ lineNum: 0, unitPrice: 9 }],
      rfqId,
    });
    // Auto-convert on submit fails SQ → retry queue; RFQ remains SUBMITTED.
    await fill.submit({ actorCompanyId: 2, rfqId });

    expect(db.tables.IC_RETRY_QUEUE).toHaveLength(1);
    expect(db.tables.IC_RFQ_HEADER[0].STATUS).toBe(IC_RFQ_STATUS.SUBMITTED);
  });

  it("T6.7 authz: wrong company cannot convert", async () => {
    const { orchestrator, fill, convert, db } = createFlow1TestStack();
    await orchestrator.run({
      cardCode: "V-B",
      dbName: "DB_A",
      docEntry: 90,
      lines: [{ ItemCode: "ITEM1", LineNum: 0, Quantity: 1 }],
    });
    const rfqId = Number(db.tables.IC_RFQ_HEADER[0].RFQ_ID);
    await fill.updateLines({
      actorCompanyId: 2,
      lines: [{ lineNum: 0, unitPrice: 5 }],
      rfqId,
    });
    await fill.submit({ actorCompanyId: 2, rfqId });

    await expect(convert.convert({ actorCompanyId: 2, rfqId })).rejects.toMatchObject({
      statusCode: 403,
    });

    // seller cannot convert; buyer can (will hit SL mocks)
    const buyerResult = await convert.convert({ actorCompanyId: 1, rfqId });
    expect(buyerResult.status).toBe("success");
  });

  it("afterPqDraftSaved never throws", async () => {
    const { orchestrator } = createFlow1TestStack({ enableFlag: false });
    const hook = createAfterPqDraftSaved(orchestrator);
    await expect(hook({ cardCode: "V-B", dbName: "DB_A", docEntry: 1 })).resolves.toMatchObject({
      status: "skipped",
    });
  });
});
