/**
 * Pure payload helpers for Flow 2 AR Invoice Draft (no I/O except tax map callback).
 */

import { SAP_OBJECT_TYPE_AR_INVOICE } from "@/modules/intercompany/infrastructure/constants";
import type { IcDocumentLineInput } from "@/modules/intercompany/flows/shared/flow.types";

import type { BuildArDraftInput, BuildArDraftResult } from "./build-ar-draft.types";

export const formatSapDate = (value: unknown): string | undefined => {
  if (value == null) {
    return undefined;
  }
  const raw = String(value).trim();
  if (!raw) {
    return undefined;
  }
  if (raw.length === 8 && /^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw;
};

export const mapPoLineToArLine = async (
  line: IcDocumentLineInput,
  mapTaxCode: (sourceTaxCode: string) => Promise<string>,
): Promise<Record<string, unknown>> => {
  const sourceTax = line.VatGroup == null ? "" : String(line.VatGroup).trim();
  const targetTax = sourceTax ? await mapTaxCode(sourceTax) : "";

  const docLine: Record<string, unknown> = {
    DiscountPercent: Number(line.DiscountPercent ?? 0),
    ItemCode: line.ItemCode as string,
    Quantity: line.Quantity as number,
    UnitPrice: (line.UnitPrice ?? line.Price) as number,
    VatGroup: targetTax || undefined,
    WarehouseCode: line.WarehouseCode as string,
  };

  if (line.LineNum !== undefined && line.LineNum !== null) {
    docLine.LineNum = Number(line.LineNum);
  }

  const uomEntry = Number(line.UoMEntry ?? line.UomEntry);
  if (Number.isFinite(uomEntry) && uomEntry > 0) {
    docLine.UoMEntry = Math.trunc(uomEntry);
    docLine.UseBaseUnit = "tNO";
  } else {
    const uomCode = line.UoMCode ?? line.UomCode;
    if (typeof uomCode === "number" || (typeof uomCode === "string" && uomCode.trim())) {
      docLine.UoMCode = uomCode as string | number;
      docLine.UseBaseUnit = "tNO";
    }
  }

  return docLine;
};

/** Build Service Layer AR Invoice Draft body from PO capture context. */
export const buildArDraftPayload = async (
  input: BuildArDraftInput,
): Promise<BuildArDraftResult> => {
  const lines = Array.isArray(input.lines) ? input.lines : [];
  const documentLines: Record<string, unknown>[] = [];
  for (const line of lines) {
    documentLines.push(await mapPoLineToArLine(line, input.mapTaxCode));
  }

  const docDate = formatSapDate(input.docDate);
  const docDueDate = formatSapDate(input.docDueDate) ?? docDate;
  const numAtCardRaw = input.numAtCard == null ? "" : String(input.numAtCard).trim();

  const payload: BuildArDraftResult = {
    CardCode: input.buyerCustomerCode,
    Comments: input.comments?.trim() || input.remarksTag,
    DocObjectCode: SAP_OBJECT_TYPE_AR_INVOICE,
    DocumentLines: documentLines,
  };

  if (docDate) {
    payload.DocDate = docDate;
  }
  if (docDueDate) {
    payload.DocDueDate = docDueDate;
  }
  if (numAtCardRaw) {
    payload.NumAtCard = numAtCardRaw;
  } else {
    payload.NumAtCard = input.remarksTag;
  }

  const branchId = input.defaultBranchId;
  if (branchId != null && Number.isFinite(branchId) && branchId > 0) {
    payload.BPL_IDAssignedToInvoice = Math.trunc(branchId);
  }

  return payload;
};
