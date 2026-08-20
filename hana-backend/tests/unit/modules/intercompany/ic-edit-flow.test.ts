import { describe, expect, it, vi } from "vitest";

import AppError from "@/core/errors/app-error";
import {
  createIcEditLifecycle,
  resolveSinglePqBaseEntry,
} from "@/modules/intercompany/api/ic-edit-lifecycle";
import { createIcEditLocks } from "@/modules/intercompany/flows/shared/ic-edit-lock";
import { createBpMappingQueries } from "@/modules/intercompany/config/bp-mapping/bp-mapping.queries";
import { createBpMappingService } from "@/modules/intercompany/config/bp-mapping/bp-mapping.service";
import { createCompanyQueries } from "@/modules/intercompany/config/company/company.queries";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import { createConfigurationQueries } from "@/modules/intercompany/config/configuration/configuration.queries";
import { createConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import { createDocumentMapMutations } from "@/modules/intercompany/domain/document-map/document-map.mutations";
import { createDocumentMapQueries } from "@/modules/intercompany/domain/document-map/document-map.queries";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createPromoteArDraftService } from "@/modules/intercompany/domain/document-map/promote-ar-draft.service";
import { createRfqMutations } from "@/modules/intercompany/domain/rfq/rfq.mutations";
import { createRfqQueries } from "@/modules/intercompany/domain/rfq/rfq.queries";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createPqCaptureService } from "@/modules/intercompany/flows/flow-1-pq-rfq-chain/01-pq-capture/pq-capture.service";
import { createUpdateRfqFromPqService } from "@/modules/intercompany/flows/flow-1-pq-rfq-chain/01-pq-capture/update-rfq-from-pq.service";
import {
  createUpdateArDraftService,
  sapTaxCodeOrEmpty,
} from "@/modules/intercompany/flows/flow-2-po-to-ar-invoice/update-ar-draft.service";
import { IC_CONFIG_KEY, IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import { createResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import {
  createMemoryDb,
  createMemorySqlClient,
  seedMemoryCompanyGraph,
} from "@/modules/intercompany/testing/memory-sql";

const createStack = () => {
  const db = createMemoryDb();
  seedMemoryCompanyGraph(db);
  db.tables.IC_CONFIGURATION.push({
    CONFIG_ID: 1,
    CONFIG_KEY: IC_CONFIG_KEY.ENABLE_FLOW1_RFQ_CHAIN,
    CONFIG_VALUE: "1",
  });
  const sql = createMemorySqlClient(db);
  const company = createCompanyService(createCompanyQueries(sql));
  const documentMap = createDocumentMapService({
    mutations: createDocumentMapMutations(sql),
    queries: createDocumentMapQueries(sql),
  });
  const rfq = createRfqService({
    mutations: createRfqMutations(sql),
    queries: createRfqQueries(sql),
  });
  const lifecycle = createIcEditLifecycle({ company, documentMap, rfq });
  const resolvePartner = createResolvePartnerService({
    bpMapping: createBpMappingService(createBpMappingQueries(sql)),
    company,
  });
  const capture = createPqCaptureService({
    configuration: createConfigurationService(createConfigurationQueries(sql)),
    documentMap,
    resolvePartner,
    rfq,
  });
  return { capture, db, documentMap, lifecycle, rfq };
};

const addRfq = (
  db: ReturnType<typeof createMemoryDb>,
  status: "DRAFT" | "SUBMITTED" | "COMPLETED",
  pqDocEntry = 55,
): void => {
  db.tables.IC_RFQ_HEADER.push({
    PQ_DRAFT_DOC_ENTRY: pqDocEntry,
    PQ_DRAFT_DOC_NUM: 9001,
    RFQ_ID: 1,
    RFQ_NUMBER: "9001",
    SOURCE_COMPANY_ID: 1,
    STATUS: status,
    TARGET_COMPANY_ID: 2,
    VENDOR_CODE: "V-B",
  });
};

const addMap = async (
  stack: ReturnType<typeof createStack>,
  targetObject: string,
  status = IC_DOC_MAP_STATUS.SUCCESS,
  targetCompanyId = 2,
  targetDocEntry: string | null = "700",
) =>
  stack.documentMap.create({
    sourceCompanyId: 1,
    sourceDocEntry: "55",
    sourceObject: targetObject === IC_OBJECT.PO ? IC_OBJECT.PQ : IC_OBJECT.PO,
    status,
    targetCompanyId,
    targetDocEntry,
    targetObject,
  });

const captureInput = {
  cardCode: "V-B",
  dbName: "DB_A",
  docEntry: 55,
  docNum: 9001,
  lines: [{ ItemCode: "BUYER-ITEM", LineNum: 0, Quantity: 2, UnitPrice: 10 }],
};

describe("IC edit lifecycle", () => {
  it("allows a PQ with no RFQ or PO mapping", async () => {
    const stack = createStack();

    await expect(stack.lifecycle.assertPqEditable("DB_A", 55)).resolves.toBeUndefined();
  });

  it("allows a PQ while its RFQ is DRAFT", async () => {
    const stack = createStack();
    addRfq(stack.db, "DRAFT");

    await expect(stack.lifecycle.assertPqEditable("DB_A", 55)).resolves.toBeUndefined();
  });

  it.each(["SUBMITTED", "COMPLETED"] as const)("locks a PQ while its RFQ is %s", async (status) => {
    const stack = createStack();
    addRfq(stack.db, status);

    await expect(stack.lifecycle.assertPqEditable("DB_A", 55)).rejects.toMatchObject({
      errorCode: "IC_PQ_LOCKED",
      statusCode: 409,
    } satisfies Partial<AppError>);
  });

  it("locks a PQ after successful PQ to PO mapping", async () => {
    const stack = createStack();
    await addMap(stack, IC_OBJECT.PO);

    await expect(stack.lifecycle.assertPqEditable("DB_A", 55)).rejects.toMatchObject({
      errorCode: "IC_PQ_LOCKED",
      statusCode: 409,
    } satisfies Partial<AppError>);
  });

  it.each([
    [undefined, undefined],
    [IC_OBJECT.AR_DRAFT, IC_DOC_MAP_STATUS.SUCCESS],
    [IC_OBJECT.AR_DRAFT, IC_DOC_MAP_STATUS.PENDING],
    [IC_OBJECT.AR_DRAFT, IC_DOC_MAP_STATUS.ERROR],
  ] as const)("allows a PO for mapping %s/%s", async (targetObject, status) => {
    const stack = createStack();
    if (targetObject && status) await addMap(stack, targetObject, status);

    await expect(stack.lifecycle.assertPoEditable("DB_A", 55)).resolves.toBeUndefined();
  });

  it("locks a PO after A/R Invoice promotion", async () => {
    const stack = createStack();
    await addMap(stack, IC_OBJECT.AR_INVOICE);

    await expect(stack.lifecycle.assertPoEditable("DB_A", 55)).rejects.toMatchObject({
      errorCode: "IC_PO_LOCKED",
      statusCode: 409,
    } satisfies Partial<AppError>);
  });

  it("rejects portal edits for an IC-created SQ", async () => {
    const stack = createStack();
    await stack.documentMap.create({
      sourceCompanyId: 1,
      sourceDocEntry: "1",
      sourceObject: IC_OBJECT.RFQ,
      status: IC_DOC_MAP_STATUS.SUCCESS,
      targetCompanyId: 2,
      targetDocEntry: "88",
      targetObject: IC_OBJECT.SQ,
    });

    await expect(stack.lifecycle.assertSqEditable("DB_B", 88)).rejects.toMatchObject({
      errorCode: "IC_SQ_LOCKED",
      statusCode: 409,
    } satisfies Partial<AppError>);
    await expect(stack.lifecycle.assertSqEditable("DB_B", 89)).resolves.toBeUndefined();
  });

  it("allows COMPLETED RFQ edit until PQ copies to PO", async () => {
    const stack = createStack();
    addRfq(stack.db, "COMPLETED");
    const header = await stack.rfq.getById(1);
    expect(header).toBeTruthy();
    const locks = createIcEditLocks({ documentMap: stack.documentMap, rfq: stack.rfq });

    await expect(locks.checkRfqEditLock(header!)).resolves.toEqual({ locked: false });

    const flagged = await stack.lifecycle.attachRfqEditFlags(header!);
    expect(flagged.pqCopiedToPo).toBe(false);

    await addMap(stack, IC_OBJECT.PO);
    await expect(locks.checkRfqEditLock(header!)).resolves.toEqual({
      locked: true,
      reason: "PQ already copied to PO",
    });
    const flaggedAfterPo = await stack.lifecycle.attachRfqEditFlags(header!);
    expect(flaggedAfterPo.pqCopiedToPo).toBe(true);
  });

  it("locks SUBMITTED RFQ lines while convert is in flight", async () => {
    const stack = createStack();
    addRfq(stack.db, "SUBMITTED");
    const header = await stack.rfq.getById(1);
    const locks = createIcEditLocks({ documentMap: stack.documentMap, rfq: stack.rfq });

    await expect(locks.checkRfqEditLock(header!)).resolves.toEqual({
      locked: true,
      reason: "RFQ cannot be edited while convert is in progress",
    });
  });

  it("captures a DRAFT RFQ as an update", async () => {
    const stack = createStack();
    addRfq(stack.db, "DRAFT");

    await expect(stack.capture.capture(captureInput)).resolves.toMatchObject({
      kind: "proceed_update",
      rfqId: 1,
    });
  });

  it.each(["SUBMITTED", "COMPLETED"] as const)(
    "captures a %s RFQ as not editable",
    async (status) => {
      const stack = createStack();
      addRfq(stack.db, status);

      await expect(stack.capture.capture(captureInput)).resolves.toMatchObject({
        kind: "skip",
        reason: "rfq_not_editable",
      });
    },
  );

  it("captures a converted PQ as already converted", async () => {
    const stack = createStack();
    await addMap(stack, IC_OBJECT.PO);

    await expect(stack.capture.capture(captureInput)).resolves.toMatchObject({
      kind: "skip",
      reason: "pq_already_converted",
    });
  });

  it("updates DRAFT RFQ commercial fields without changing seller identity", async () => {
    const stack = createStack();
    addRfq(stack.db, "DRAFT");
    stack.db.tables.IC_RFQ_LINE.push({
      DELIVERY_DATE: "2026-08-01",
      DESCRIPTION: "Seller description",
      DISCOUNT: 0,
      ITEM_CODE: "SELLER-ITEM",
      LINE_NUM: 0,
      QUANTITY: 1,
      RFQ_ID: 1,
      RFQ_LINE_ID: 1,
      TAX_CODE: "IN-12.5",
      UNIT_PRICE: 5,
    });

    await createUpdateRfqFromPqService({ rfq: stack.rfq }).update({
      purchaseQuotation: {
        ...captureInput,
        lines: [
          {
            DiscountPercent: 7,
            ItemCode: "BUYER-CHANGED",
            LineNum: 0,
            Quantity: 3,
            ShipDate: "2026-09-10",
            UnitPrice: 12,
            VatGroup: "IN-18",
          },
        ],
      },
      rfqId: 1,
    });

    expect(stack.db.tables.IC_RFQ_LINE[0]).toMatchObject({
      DELIVERY_DATE: "2026-09-10",
      DESCRIPTION: "Seller description",
      DISCOUNT: 7,
      ITEM_CODE: "SELLER-ITEM",
      QUANTITY: 3,
      TAX_CODE: "IN-18",
      UNIT_PRICE: 12,
    });
  });

  it("keeps RFQ TAX_CODE when PQ update omits VatGroup", async () => {
    const stack = createStack();
    addRfq(stack.db, "DRAFT");
    stack.db.tables.IC_RFQ_LINE.push({
      ITEM_CODE: "SELLER-ITEM",
      LINE_NUM: 0,
      QUANTITY: 1,
      RFQ_ID: 1,
      RFQ_LINE_ID: 1,
      TAX_CODE: "IN-12.5",
      UNIT_PRICE: 5,
    });

    await createUpdateRfqFromPqService({ rfq: stack.rfq }).update({
      purchaseQuotation: {
        ...captureInput,
        lines: [{ ItemCode: "BUYER-ITEM", LineNum: 0, Quantity: 2, UnitPrice: 9 }],
      },
      rfqId: 1,
    });

    expect(stack.db.tables.IC_RFQ_LINE[0]?.TAX_CODE).toBe("IN-12.5");
  });

  it("does not wipe RFQ quoted qty when buyer PQ quoted qty is 0", async () => {
    const stack = createStack();
    addRfq(stack.db, "DRAFT");
    stack.db.tables.IC_RFQ_LINE.push({
      ITEM_CODE: "SELLER-ITEM",
      LINE_NUM: 0,
      QUANTITY: 4,
      RFQ_ID: 1,
      RFQ_LINE_ID: 1,
      UNIT_PRICE: 5,
    });

    await createUpdateRfqFromPqService({ rfq: stack.rfq }).update({
      purchaseQuotation: {
        ...captureInput,
        lines: [{ ItemCode: "BUYER-ITEM", LineNum: 0, Quantity: 0, RequiredQuantity: 9 }],
      },
      rfqId: 1,
    });

    expect(stack.db.tables.IC_RFQ_LINE[0]?.QUANTITY).toBe(4);
  });
});

describe("PQ to PO source resolution", () => {
  it("accepts only lines copied from one Purchase Quotation", () => {
    expect(
      resolveSinglePqBaseEntry([
        { BaseEntry: 55, BaseType: 540000006 },
        { BaseEntry: 55, BaseType: 540000006 },
      ]),
    ).toBe(55);
  });

  it.each([
    [{ BaseEntry: 55, BaseType: 540000006 }, {}],
    [
      { BaseEntry: 55, BaseType: 540000006 },
      { BaseEntry: 56, BaseType: 540000006 },
    ],
    [{ BaseEntry: 55, BaseType: 22 }],
  ])("rejects mixed, multiple, or non-PQ sources", (...lines) => {
    expect(resolveSinglePqBaseEntry(lines)).toBeUndefined();
  });

  it("records an idempotent PQ to PO map for an IC PQ", async () => {
    const stack = createStack();
    await stack.documentMap.create({
      sourceCompanyId: 1,
      sourceDocEntry: "55",
      sourceObject: IC_OBJECT.PQ,
      status: IC_DOC_MAP_STATUS.SUCCESS,
      targetCompanyId: 2,
      targetDocEntry: "1",
      targetObject: IC_OBJECT.RFQ,
    });
    const input = {
      dbName: "DB_A",
      lines: [{ BaseEntry: 55, BaseType: 540000006 }],
      poDocEntry: 99,
      poDocNum: 1099,
    };

    await stack.lifecycle.recordPqToPoLink(input);
    await stack.lifecycle.recordPqToPoLink(input);

    await expect(
      stack.documentMap.findBySource({
        sourceCompanyId: 1,
        sourceDocEntry: "55",
        sourceObject: IC_OBJECT.PQ,
        targetObject: IC_OBJECT.PO,
      }),
    ).resolves.toMatchObject({
      status: IC_DOC_MAP_STATUS.SUCCESS,
      targetDocEntry: "99",
      targetDocNum: "1099",
    });
    expect(
      stack.db.tables.IC_DOCUMENT_MAPPING.filter((row) => row.TARGET_OBJECT === IC_OBJECT.PO),
    ).toHaveLength(1);
  });
});

describe("PO to A/R Draft propagation", () => {
  it("patches a fully merged draft while preserving seller identity and SQ base links", async () => {
    const stack = createStack();
    await addMap(stack, IC_OBJECT.AR_DRAFT);
    const patchArInvoiceDraft = vi.fn(async () => undefined);
    const service = createUpdateArDraftService({
      documentMap: stack.documentMap,
      documents: {
        getArInvoiceDraft: async () => ({
          CardCode: "SELLER-CUSTOMER",
          DocumentLines: [
            {
              BaseEntry: 300,
              BaseLine: 0,
              BaseType: 23,
              ItemCode: "SELLER-ITEM",
              LineNum: 0,
              Quantity: 1,
              UnitPrice: 5,
            },
          ],
        }),
        patchArInvoiceDraft,
      },
    });

    await service.update({
      buyerCompanyId: 1,
      purchaseOrder: {
        cardCode: "BUYER-VENDOR",
        dbName: "DB_A",
        docEntry: 55,
        lines: [{ ItemCode: "BUYER-ITEM", LineNum: 0, Quantity: 4, UnitPrice: 12 }],
        remarks: "Updated PO",
      },
    });

    expect(patchArInvoiceDraft).toHaveBeenCalledWith({
      companyId: 2,
      draftEntry: 700,
      patch: {
        Comments: "Updated PO",
        DocumentLines: [
          {
            BaseEntry: 300,
            BaseLine: 0,
            BaseType: 23,
            ItemCode: "SELLER-ITEM",
            LineNum: 0,
            Quantity: 4,
            UnitPrice: 12,
          },
        ],
      },
    });
  });

  it("maps buyer purchase tax to seller sales tax and never copies IN-* / WH / UoM", async () => {
    const stack = createStack();
    await addMap(stack, IC_OBJECT.AR_DRAFT);
    const patchArInvoiceDraft = vi.fn(async () => undefined);
    const resolveLineTax = vi.fn(async () => "OUT-18");
    const service = createUpdateArDraftService({
      documentMap: stack.documentMap,
      documents: {
        getArInvoiceDraft: async () => ({
          CardCode: "SELLER-CUSTOMER",
          DocumentLines: [
            {
              BaseEntry: 300,
              BaseLine: 0,
              BaseType: 23,
              ItemCode: "SELLER-ITEM",
              LineNum: 0,
              Quantity: 1,
              UnitPrice: 5,
              UoMCode: "NOS",
              UoMEntry: 1,
              VatGroup: "OUT-12.5",
              WarehouseCode: "SL-WH",
            },
          ],
        }),
        patchArInvoiceDraft,
      },
      partnerTax: {
        resolve: async () => ({ docSide: "sales", source: "ovtg_rate", taxCode: "OUT-18" }),
        resolveLineTax,
      },
    });

    await service.update({
      buyerCompanyId: 1,
      purchaseOrder: {
        cardCode: "BUYER-VENDOR",
        dbName: "DB_A",
        docEntry: 55,
        lines: [
          {
            ItemCode: "BUYER-ITEM",
            LineNum: 0,
            Quantity: 4,
            UnitPrice: 12,
            UoMCode: "BUYER-UOM",
            VatGroup: "IN-18",
            WarehouseCode: "BY-WH",
          },
        ],
      },
    });

    expect(resolveLineTax).toHaveBeenCalledWith(
      expect.objectContaining({
        docSide: "sales",
        itemCode: "SELLER-ITEM",
        sourceCompanyId: 1,
        sourceTaxCode: "IN-18",
        targetCardCode: "SELLER-CUSTOMER",
        targetCompanyId: 2,
      }),
    );
    const patchedLines = patchArInvoiceDraft.mock.calls[0]?.[0]?.patch?.DocumentLines as Record<
      string,
      unknown
    >[];
    expect(patchedLines[0]).toMatchObject({
      ItemCode: "SELLER-ITEM",
      Quantity: 4,
      UoMCode: "NOS",
      VatGroup: "OUT-18",
      WarehouseCode: "SL-WH",
    });
    expect(patchedLines[0]?.VatGroup).not.toBe("IN-18");
    expect(patchedLines[0]?.WarehouseCode).not.toBe("BY-WH");
  });

  it("keeps seller VatGroup when buyer tax cannot be mapped", async () => {
    const stack = createStack();
    await addMap(stack, IC_OBJECT.AR_DRAFT);
    const patchArInvoiceDraft = vi.fn(async () => undefined);
    const service = createUpdateArDraftService({
      documentMap: stack.documentMap,
      documents: {
        getArInvoiceDraft: async () => ({
          CardCode: "SELLER-CUSTOMER",
          DocumentLines: [
            {
              ItemCode: "SELLER-ITEM",
              LineNum: 0,
              Quantity: 1,
              VatGroup: "OUT-12.5",
            },
          ],
        }),
        patchArInvoiceDraft,
      },
      partnerTax: {
        resolve: async () => ({ docSide: "sales", source: "omit", taxCode: "" }),
        resolveLineTax: async () => "",
      },
    });

    await service.update({
      buyerCompanyId: 1,
      purchaseOrder: {
        cardCode: "BUYER-VENDOR",
        dbName: "DB_A",
        docEntry: 55,
        lines: [{ ItemCode: "BUYER-ITEM", LineNum: 0, Quantity: 2, VatGroup: "IN-18" }],
      },
    });

    expect(patchArInvoiceDraft.mock.calls[0]?.[0]?.patch?.DocumentLines?.[0]?.VatGroup).toBe(
      "OUT-12.5",
    );
  });

  it("drops garbled GET tax codes so SAP is not PATCHed with invalid VatGroup", async () => {
    const stack = createStack();
    await addMap(stack, IC_OBJECT.AR_DRAFT);
    const patchArInvoiceDraft = vi.fn(async () => undefined);
    await createUpdateArDraftService({
      documentMap: stack.documentMap,
      documents: {
        getArInvoiceDraft: async () => ({
          DocumentLines: [
            {
              ItemCode: "SELLER-ITEM",
              LineNum: 0,
              Quantity: 1,
              TaxCode: "\uFEFF∩┐╜▌º",
              VatGroup: "\uFEFF∩┐╜▌º",
            },
          ],
        }),
        patchArInvoiceDraft,
      },
    }).update({
      buyerCompanyId: 1,
      purchaseOrder: {
        cardCode: "BUYER-VENDOR",
        dbName: "DB_A",
        docEntry: 55,
        lines: [{ ItemCode: "BUYER-ITEM", LineNum: 0, Quantity: 2 }],
      },
    });

    const patched = patchArInvoiceDraft.mock.calls[0]?.[0]?.patch?.DocumentLines?.[0] as Record<
      string,
      unknown
    >;
    expect(patched).not.toHaveProperty("VatGroup");
    expect(patched).not.toHaveProperty("TaxCode");
  });

  it("accepts printable SAP tax codes and rejects BOM / mojibake", () => {
    expect(sapTaxCodeOrEmpty("OUT-18")).toBe("OUT-18");
    expect(sapTaxCodeOrEmpty("IN-12.5")).toBe("IN-12.5");
    expect(sapTaxCodeOrEmpty("\uFEFFIN-18")).toBe("IN-18");
    expect(sapTaxCodeOrEmpty("∩┐╜▌º")).toBe("");
    expect(sapTaxCodeOrEmpty("TOO-LONG-TAX")).toBe("");
  });

  it("skips maps without a usable A/R Draft target", async () => {
    const stack = createStack();
    await addMap(stack, IC_OBJECT.AR_DRAFT, IC_DOC_MAP_STATUS.ERROR, 2, null);
    const getArInvoiceDraft = vi.fn(async () => ({}));

    await createUpdateArDraftService({
      documentMap: stack.documentMap,
      documents: { getArInvoiceDraft, patchArInvoiceDraft: async () => undefined },
    }).update({
      buyerCompanyId: 1,
      purchaseOrder: { cardCode: "V-B", dbName: "DB_A", docEntry: 55 },
    });

    expect(getArInvoiceDraft).not.toHaveBeenCalled();
  });

  it.each([IC_DOC_MAP_STATUS.PENDING, IC_DOC_MAP_STATUS.ERROR])(
    "patches a usable %s A/R Draft mapping",
    async (status) => {
      const stack = createStack();
      await addMap(stack, IC_OBJECT.AR_DRAFT, status);
      const patchArInvoiceDraft = vi.fn(async () => undefined);

      await createUpdateArDraftService({
        documentMap: stack.documentMap,
        documents: {
          getArInvoiceDraft: async () => ({ DocumentLines: [] }),
          patchArInvoiceDraft,
        },
      }).update({
        buyerCompanyId: 1,
        purchaseOrder: { cardCode: "V-B", dbName: "DB_A", docEntry: 55 },
      });

      expect(patchArInvoiceDraft).toHaveBeenCalledOnce();
    },
  );

  it("skips propagation after invoice promotion", async () => {
    const stack = createStack();
    await addMap(stack, IC_OBJECT.AR_DRAFT);
    await addMap(stack, IC_OBJECT.AR_INVOICE);
    const getArInvoiceDraft = vi.fn(async () => ({}));

    await createUpdateArDraftService({
      documentMap: stack.documentMap,
      documents: { getArInvoiceDraft, patchArInvoiceDraft: async () => undefined },
    }).update({
      buyerCompanyId: 1,
      purchaseOrder: { cardCode: "V-B", dbName: "DB_A", docEntry: 55 },
    });

    expect(getArInvoiceDraft).not.toHaveBeenCalled();
  });

  it("does not mutate the mapping when target PATCH fails", async () => {
    const stack = createStack();
    const mapping = await addMap(stack, IC_OBJECT.AR_DRAFT);
    const service = createUpdateArDraftService({
      documentMap: stack.documentMap,
      documents: {
        getArInvoiceDraft: async () => ({ DocumentLines: [] }),
        patchArInvoiceDraft: async () => {
          throw new Error("SAP unavailable");
        },
      },
    });

    await expect(
      service.update({
        buyerCompanyId: 1,
        purchaseOrder: { cardCode: "V-B", dbName: "DB_A", docEntry: 55 },
      }),
    ).rejects.toThrow("SAP unavailable");
    await expect(
      stack.documentMap.findBySource({
        sourceCompanyId: 1,
        sourceDocEntry: "55",
        sourceObject: IC_OBJECT.PO,
        targetObject: IC_OBJECT.AR_DRAFT,
      }),
    ).resolves.toMatchObject({ mappingId: mapping.mappingId, status: mapping.status });
  });
});

describe("A/R Invoice confirmation", () => {
  it("returns not found when the seller has no PO mapping", async () => {
    const stack = createStack();
    const service = createPromoteArDraftService({
      documentMap: stack.documentMap,
      documents: { getPostedArInvoice: async () => ({ docEntry: 900 }) },
    });

    await expect(
      service.promote({ arInvoiceDocEntry: 900, poDocEntry: 55, sellerCompanyId: 2 }),
    ).rejects.toMatchObject({ errorCode: "IC_AR_MAPPING_NOT_FOUND", statusCode: 404 });
  });

  it("enforces seller ownership", async () => {
    const stack = createStack();
    await addMap(stack, IC_OBJECT.AR_DRAFT);
    const service = createPromoteArDraftService({
      documentMap: stack.documentMap,
      documents: { getPostedArInvoice: async () => ({ docEntry: 900 }) },
    });

    await expect(
      service.promote({ arInvoiceDocEntry: 900, poDocEntry: 55, sellerCompanyId: 1 }),
    ).rejects.toMatchObject({ errorCode: "IC_AR_MAPPING_NOT_FOUND", statusCode: 404 });
  });

  it("verifies and promotes a posted seller invoice idempotently", async () => {
    const stack = createStack();
    await addMap(stack, IC_OBJECT.AR_DRAFT);
    const getPostedArInvoice = vi.fn(async () => ({ docEntry: 900, docNum: 1900 }));
    const service = createPromoteArDraftService({
      documentMap: stack.documentMap,
      documents: { getPostedArInvoice },
    });

    const first = await service.promote({
      arInvoiceDocEntry: 900,
      poDocEntry: 55,
      sellerCompanyId: 2,
    });
    const second = await service.promote({
      arInvoiceDocEntry: 901,
      poDocEntry: 55,
      sellerCompanyId: 2,
    });

    expect(first).toMatchObject({ arInvoiceDocEntry: "900", arInvoiceDocNum: "1900" });
    expect(second).toEqual(first);
    expect(getPostedArInvoice).toHaveBeenCalledOnce();
  });

  it("does not promote when posted-invoice verification fails", async () => {
    const stack = createStack();
    const mapping = await addMap(stack, IC_OBJECT.AR_DRAFT);
    const service = createPromoteArDraftService({
      documentMap: stack.documentMap,
      documents: {
        getPostedArInvoice: async () => {
          throw new Error("Invoice not found in SAP");
        },
      },
    });

    await expect(
      service.promote({ arInvoiceDocEntry: 900, poDocEntry: 55, sellerCompanyId: 2 }),
    ).rejects.toThrow("Invoice not found in SAP");
    await expect(
      stack.documentMap.findBySourceForTargetCompany({
        sourceDocEntry: "55",
        sourceObject: IC_OBJECT.PO,
        targetCompanyId: 2,
      }),
    ).resolves.toMatchObject({
      mappingId: mapping.mappingId,
      targetObject: IC_OBJECT.AR_DRAFT,
    });
  });
});
