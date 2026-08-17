import {
  createPartnerTaxResolver,
  type PartnerTaxResolver,
} from "@/modules/intercompany/config/tax-mapping/resolve-partner-tax.service";
import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { IcPoHookInput } from "@/modules/intercompany/flows/shared/flow.types";
import { IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import { createIcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import { SAP_FIELD_MAX } from "@/validation/schemas/inputs/sap-document-fields";

/** Qty / price / dates only. Never copy buyer VatGroup, WH, UoM, or ItemCode. */
const commercialLineKeys = [
  "Quantity",
  "UnitPrice",
  "DiscountPercent",
  "ShipDate",
  "ReqDate",
] as const;

/** OVTG.Code is 8 printable ASCII chars. Drops BOM / mojibake / buyer garbage. */
export const sapTaxCodeOrEmpty = (value: unknown): string => {
  const raw = String(value ?? "")
    .replaceAll("\uFEFF", "")
    .trim();
  if (!raw || raw.length > SAP_FIELD_MAX.vatGroup) {
    return "";
  }
  return /^[\x20-\x7E]+$/.test(raw) ? raw : "";
};

const buyerLineTax = (line: Record<string, unknown> | undefined): string =>
  sapTaxCodeOrEmpty(line?.VatGroup ?? line?.TaxCode ?? line?.taxCode);

const dropInvalidTaxFields = (line: Record<string, unknown>): Record<string, unknown> => {
  const next = { ...line };
  const vatGroup = sapTaxCodeOrEmpty(next.VatGroup);
  if (vatGroup) {
    next.VatGroup = vatGroup;
  } else {
    delete next.VatGroup;
  }
  const taxCode = sapTaxCodeOrEmpty(next.TaxCode);
  if (taxCode) {
    next.TaxCode = taxCode;
  } else {
    delete next.TaxCode;
  }
  return next;
};

const mergeLines = (
  existing: Record<string, unknown>[],
  source: Record<string, unknown>[],
): Record<string, unknown>[] =>
  existing.map((base, index) => {
    const baseLineNum = Number(base.LineNum ?? index);
    const sourceLine = source.find(
      (line, sourceIndex) => Number(line.LineNum ?? sourceIndex) === baseLineNum,
    );
    const cleaned = dropInvalidTaxFields(base);
    if (!sourceLine) {
      return cleaned;
    }
    const next = { ...cleaned };
    for (const key of commercialLineKeys) {
      if (sourceLine[key] !== undefined && sourceLine[key] !== null && sourceLine[key] !== "") {
        next[key] = sourceLine[key];
      }
    }
    if (sourceLine.Quantity !== undefined) {
      next.Quantity = sourceLine.Quantity;
    }
    if (sourceLine.UnitPrice !== undefined) {
      next.UnitPrice = sourceLine.UnitPrice;
    }
    if (sourceLine.DiscountPercent !== undefined) {
      next.DiscountPercent = sourceLine.DiscountPercent;
    }
    return next;
  });

const applySellerSalesTax = async (input: {
  buyerCompanyId: number;
  partnerTax: PartnerTaxResolver;
  sourceLines: Record<string, unknown>[];
  targetCardCode: string;
  targetCompanyId: number;
  lines: Record<string, unknown>[];
}): Promise<Record<string, unknown>[]> => {
  const next: Record<string, unknown>[] = [];
  for (const [index, line] of input.lines.entries()) {
    const sourceLine = input.sourceLines.find(
      (row, sourceIndex) => Number(row.LineNum ?? sourceIndex) === Number(line.LineNum ?? index),
    );
    const sourceTax = buyerLineTax(sourceLine);
    if (!sourceTax) {
      next.push(line);
      continue;
    }

    const mapped = sapTaxCodeOrEmpty(
      await input.partnerTax.resolveLineTax({
        docSide: "sales",
        itemCode: String(line.ItemCode ?? sourceLine?.ItemCode ?? "").trim(),
        sourceCompanyId: input.buyerCompanyId,
        sourceTaxCode: sourceTax,
        targetCardCode: input.targetCardCode,
        targetCompanyId: input.targetCompanyId,
      }),
    );
    if (mapped) {
      next.push({ ...line, VatGroup: mapped });
      continue;
    }

    icLog.warn(IC_LOG_SCOPE.TAX, "IC edit sync — omit buyer tax on seller A/R draft", {
      check: "ic_edit_sync.seller_tax",
      itemCode: line.ItemCode ?? null,
      outcome: "skip",
      sourceTaxCode: sourceTax,
      targetCompanyId: input.targetCompanyId,
    });
    next.push(line);
  }
  return next;
};

export type UpdateArDraftService = {
  update: (input: { buyerCompanyId: number; purchaseOrder: IcPoHookInput }) => Promise<void>;
};

/** Best-effort PO mirror; document maps are never mutated after a target PATCH failure. */
export const createUpdateArDraftService = (deps?: {
  documentMap?: DocumentMapService;
  documents?: Pick<IcSlDocuments, "getArInvoiceDraft" | "patchArInvoiceDraft">;
  partnerTax?: PartnerTaxResolver;
}): UpdateArDraftService => {
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const documents = deps?.documents ?? createIcSlDocuments();
  const partnerTax = deps?.partnerTax ?? createPartnerTaxResolver();

  return {
    update: async ({ buyerCompanyId, purchaseOrder }) => {
      const invoiceMap = await documentMap.findBySource({
        sourceCompanyId: buyerCompanyId,
        sourceDocEntry: String(purchaseOrder.docEntry),
        sourceObject: IC_OBJECT.PO,
        targetObject: IC_OBJECT.AR_INVOICE,
      });
      if (invoiceMap?.status === IC_DOC_MAP_STATUS.SUCCESS) {
        return;
      }
      const map = await documentMap.findBySource({
        sourceCompanyId: buyerCompanyId,
        sourceDocEntry: String(purchaseOrder.docEntry),
        sourceObject: IC_OBJECT.PO,
        targetObject: IC_OBJECT.AR_DRAFT,
      });
      const draftEntry = Number(map?.targetDocEntry);
      if (!map || !map.targetCompanyId || !Number.isFinite(draftEntry) || draftEntry <= 0) {
        return;
      }

      const current = await documents.getArInvoiceDraft({
        companyId: map.targetCompanyId,
        draftEntry,
      });
      const currentLines = Array.isArray(current.DocumentLines)
        ? (current.DocumentLines as Record<string, unknown>[])
        : [];
      const sourceLines = (purchaseOrder.lines ?? []) as Record<string, unknown>[];
      const merged = mergeLines(currentLines, sourceLines);
      const documentLines = await applySellerSalesTax({
        buyerCompanyId,
        lines: merged,
        partnerTax,
        sourceLines,
        targetCardCode: String(current.CardCode ?? "").trim(),
        targetCompanyId: map.targetCompanyId,
      });
      const patch: Record<string, unknown> = {
        DocumentLines: documentLines,
      };
      const headers = {
        Address: purchaseOrder.address,
        Address2: purchaseOrder.address2,
        Comments: purchaseOrder.remarks,
        DocDate: purchaseOrder.docDate,
        DocDueDate: purchaseOrder.docDueDate,
        NumAtCard: purchaseOrder.numAtCard,
        SalesPersonCode: purchaseOrder.salesPersonCode,
      };
      for (const [key, value] of Object.entries(headers)) {
        if (value !== undefined && value !== null) {
          patch[key] = value;
        }
      }
      await documents.patchArInvoiceDraft({ companyId: map.targetCompanyId, draftEntry, patch });
      icLog.info(IC_LOG_SCOPE.EDIT, "IC edit sync — PO mirrored to seller A/R draft", {
        check: "ic_edit_sync.apply",
        draftEntry,
        mappingId: map.mappingId,
        outcome: "pass",
        poDocEntry: purchaseOrder.docEntry,
      });
    },
  };
};
