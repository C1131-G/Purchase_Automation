/**
 * Pure payload helpers for Flow 2 AR Invoice Draft (no I/O except tax resolve callback).
 */

import { SAP_OBJECT_TYPE_AR_INVOICE } from "@/modules/intercompany/infrastructure/constants";
import { buildFlow2ArRemarks } from "@/modules/intercompany/infrastructure/ic-remarks-chain";
import {
  flow2LineTaxUsage,
  type IcLineTaxUsage,
} from "@/modules/intercompany/infrastructure/ic-tax-usage";
import type { IcDocumentLineInput } from "@/modules/intercompany/flows/shared/flow.types";

import type { BuildArDraftInput, BuildArDraftResult } from "./build-ar-draft.types";

export type ResolveArLineTax = (input: {
  sourceTaxCode: string;
  itemCode: string;
}) => Promise<string>;

export type MapPoLineToArResult = {
  docLine: Record<string, unknown>;
  taxUsage: IcLineTaxUsage;
};

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
  resolveLineTax: ResolveArLineTax,
): Promise<MapPoLineToArResult> => {
  // PO tax = buyer purchase VatGroup on the PO line.
  const poTaxCode = line.VatGroup == null ? "" : String(line.VatGroup).trim();
  const itemCode = line.ItemCode == null ? "" : String(line.ItemCode).trim();
  // Always resolve (map → item → BP → omit), even when buyer tax is empty.
  const arTaxCode = (await resolveLineTax({ itemCode, sourceTaxCode: poTaxCode })).trim();

  const docLine: Record<string, unknown> = {
    DiscountPercent: Number(line.DiscountPercent ?? 0),
    ItemCode: line.ItemCode as string,
    Quantity: line.Quantity as number,
    UnitPrice: (line.UnitPrice ?? line.Price) as number,
    VatGroup: arTaxCode || undefined,
    WarehouseCode: line.WarehouseCode as string,
  };

  const itemDescription = String(line.ItemDescription ?? line.ItemName ?? "").trim();
  if (itemDescription) {
    docLine.ItemDescription = itemDescription;
  }

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

  const taxUsage = flow2LineTaxUsage({
    arTaxCode,
    itemCode,
    lineNum: line.LineNum != null ? Number(line.LineNum) : 0,
    poTaxCode,
  });

  return { docLine, taxUsage };
};

/** Build Service Layer AR Invoice Draft body from PO capture context. */
export const buildArDraftPayload = async (
  input: BuildArDraftInput,
): Promise<BuildArDraftResult & { taxUsage: IcLineTaxUsage[] }> => {
  const lines = Array.isArray(input.lines) ? input.lines : [];
  const documentLines: Record<string, unknown>[] = [];
  const taxUsage: IcLineTaxUsage[] = [];
  for (const line of lines) {
    const mapped = await mapPoLineToArLine(line, input.resolveLineTax);
    documentLines.push(mapped.docLine);
    taxUsage.push(mapped.taxUsage);
  }

  const docDate = formatSapDate(input.docDate);
  const docDueDate = formatSapDate(input.docDueDate) ?? docDate;
  const numAtCardRaw = input.numAtCard == null ? "" : String(input.numAtCard).trim();

  // Keep existing PO comments; append IC | PO No … only (no Flow 1/2 wording).
  const comments = buildFlow2ArRemarks({
    existingComments: input.comments,
    poDocEntry: input.poDocEntry,
    poDocNum: input.poDocNum,
  });

  const payload: BuildArDraftResult = {
    CardCode: input.buyerCustomerCode,
    Comments: comments,
    DocObjectCode: SAP_OBJECT_TYPE_AR_INVOICE,
    DocumentLines: documentLines,
  };

  if (docDate) {
    payload.DocDate = docDate;
  }
  if (docDueDate) {
    payload.DocDueDate = docDueDate;
  }
  // NumAtCard: keep buyer PO ref if present; else compact IC-PO tag.
  if (numAtCardRaw) {
    payload.NumAtCard = numAtCardRaw.slice(0, 100);
  } else {
    payload.NumAtCard = (input.remarksTag || "").slice(0, 100);
  }

  const branchId = input.defaultBranchId;
  if (branchId != null && Number.isFinite(branchId) && branchId > 0) {
    payload.BPL_IDAssignedToInvoice = Math.trunc(branchId);
  }

  return { ...payload, taxUsage };
};
