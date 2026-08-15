import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import { createIcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import type { IcPoHookInput } from "@/modules/intercompany/flows/shared/flow.types";

const editableLineKeys = [
  "Quantity",
  "UnitPrice",
  "DiscountPercent",
  "ShipDate",
  "ReqDate",
  "VatGroup",
  "WarehouseCode",
  "UoMEntry",
  "UoMCode",
] as const;

const mergeLines = (
  existing: Record<string, unknown>[],
  source: Record<string, unknown>[],
): Record<string, unknown>[] =>
  existing.map((base, index) => {
    const baseLineNum = Number(base.LineNum ?? index);
    const sourceLine = source.find(
      (line, sourceIndex) => Number(line.LineNum ?? sourceIndex) === baseLineNum,
    );
    if (!sourceLine) {
      return base;
    }
    const next = { ...base };
    for (const key of editableLineKeys) {
      if (sourceLine[key] !== undefined && sourceLine[key] !== null && sourceLine[key] !== "") {
        next[key] = sourceLine[key];
      }
    }
    return next;
  });

export type UpdateArDraftService = {
  update: (input: { buyerCompanyId: number; purchaseOrder: IcPoHookInput }) => Promise<void>;
};

/** Best-effort PO mirror; document maps are never mutated after a target PATCH failure. */
export const createUpdateArDraftService = (deps?: {
  documentMap?: DocumentMapService;
  documents?: Pick<IcSlDocuments, "getArInvoiceDraft" | "patchArInvoiceDraft">;
}): UpdateArDraftService => {
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const documents = deps?.documents ?? createIcSlDocuments();

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
      const patch: Record<string, unknown> = {
        DocumentLines: mergeLines(
          currentLines,
          (purchaseOrder.lines ?? []) as Record<string, unknown>[],
        ),
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
