/**
 * Pure payload helpers for Flow 2 AR Invoice Draft.
 * Draft is always converted from seller Sales Quotation (BaseType 23) — never free-standing PO lines.
 */

import {
  IC_SAP_DOC_ORIGIN_PORTAL,
  SAP_OBJECT_TYPE_AR_INVOICE,
} from "@/modules/intercompany/infrastructure/constants";
import {
  buildFlow2ArRemarks,
  clampSapDocumentComments,
} from "@/modules/intercompany/infrastructure/ic-remarks-chain";
import { SAP_OBJ_SALES_QUOTATION } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

import type {
  BuildArInvoiceInput,
  BuildArInvoiceResult,
  SqBaseLineInput,
} from "./build-ar-invoice.types";

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

/** True when SAP SQ line is still open for convert (closed lines skipped). */
export const isSqLineOpenForConvert = (line: SqBaseLineInput): boolean => {
  const status = line.LineStatus == null ? "" : String(line.LineStatus).trim().toLowerCase();
  if (status === "bost_close" || status === "c" || status === "closed") {
    return false;
  }
  const openQty = line.RemainingOpenQuantity;
  if (openQty != null && Number.isFinite(Number(openQty)) && Number(openQty) <= 0) {
    return false;
  }
  return true;
};

/**
 * Map one open SQ line → AR Invoice Draft DocumentLine based on SQ (SAP copy-to).
 * SAP pulls ItemCode, price, tax, UoM, warehouse from the base SQ line.
 */
export const mapSqLineToArBaseLine = (params: {
  sqDocEntry: number;
  line: SqBaseLineInput;
}): Record<string, unknown> => {
  const lineNum = Math.trunc(Number(params.line.LineNum));
  if (!Number.isFinite(lineNum) || lineNum < 0) {
    throw new Error(`IC AR draft convert: invalid SQ LineNum=${String(params.line.LineNum)}`);
  }
  const baseEntry = Math.trunc(Number(params.sqDocEntry));
  if (!Number.isFinite(baseEntry) || baseEntry <= 0) {
    throw new Error(`IC AR draft convert: invalid SQ DocEntry=${String(params.sqDocEntry)}`);
  }

  const docLine: Record<string, unknown> = {
    BaseEntry: baseEntry,
    BaseLine: lineNum,
    BaseType: SAP_OBJ_SALES_QUOTATION,
  };

  // Prefer remaining open qty when partial convert; else full line qty.
  const openQty = params.line.RemainingOpenQuantity;
  const qty = params.line.Quantity;
  if (openQty != null && Number.isFinite(Number(openQty)) && Number(openQty) > 0) {
    docLine.Quantity = Number(openQty);
  } else if (qty != null && Number.isFinite(Number(qty)) && Number(qty) > 0) {
    docLine.Quantity = Number(qty);
  }

  return docLine;
};

/** True when value is an IC system tag (must not fill Customer Ref No). */
const isIcAutoNumAtCard = (value: string): boolean =>
  /^IC[-|]?(PQ|PO|RFQ|SQ|AR)\b/i.test(value.trim()) ||
  /^(?:auto\s+generated\s+)?based on\s+/i.test(value.trim());

/** Build Service Layer A/R Invoice Draft body: convert seller SQ → POST /Drafts. */
export const buildArInvoicePayload = (input: BuildArInvoiceInput): BuildArInvoiceResult => {
  const sqDocEntry = Math.trunc(Number(input.sqDocEntry));
  if (!Number.isFinite(sqDocEntry) || sqDocEntry <= 0) {
    throw new Error("IC Flow 2 requires seller SQ DocEntry to convert to A/R Invoice Draft");
  }

  const openLines = (Array.isArray(input.sqLines) ? input.sqLines : []).filter(
    isSqLineOpenForConvert,
  );
  if (openLines.length === 0) {
    throw new Error(
      `IC Flow 2: seller SQ DocEntry=${sqDocEntry} has no open lines to convert to A/R Invoice Draft`,
    );
  }

  const documentLines = openLines.map((line) => mapSqLineToArBaseLine({ line, sqDocEntry }));

  const docDate = formatSapDate(input.docDate);
  const docDueDate = formatSapDate(input.docDueDate) ?? docDate;
  const numAtCardRaw = input.numAtCard == null ? "" : String(input.numAtCard).trim();

  // Keep existing PO comments; ensure PQ (buyer) + RFQ (seller) + SQ (seller).
  // SAP Document.Comments is max 254 — long company names + chain easily overflow.
  const comments = clampSapDocumentComments(
    buildFlow2ArRemarks({
      buyerCompanyName: input.buyerCompanyName,
      sellerCompanyName: input.sellerCompanyName,
      cardName: input.remarksCardName,
      existingComments: input.comments,
      pqDocEntry: input.pqDocEntry,
      pqDocNum: input.pqDocNum,
      rfqId: input.rfqId,
      rfqNumber: input.rfqNumber,
      sqDocEntry: input.sqDocEntry,
      sqDocNum: input.sqDocNum,
    }),
  );

  // A/R Invoice Draft body (POST /Drafts). DocObjectCode 13 = A/R Invoice object type.
  // Lines are BaseType 23 only — not free-standing ItemCode/VatGroup rows.
  // U_Origin marks IC auto drafts as Portal-origin (same UDF as marketing docs).
  const payload: BuildArInvoiceResult = {
    CardCode: input.buyerCustomerCode,
    Comments: comments,
    DocObjectCode: SAP_OBJECT_TYPE_AR_INVOICE,
    DocumentLines: documentLines,
    U_Origin: IC_SAP_DOC_ORIGIN_PORTAL,
  };

  if (docDate) {
    payload.DocDate = docDate;
  }
  if (docDueDate) {
    payload.DocDueDate = docDueDate;
  }
  // Customer Ref No (NumAtCard): only real buyer PO vendor ref — never IC-PO auto tags.
  if (numAtCardRaw && !isIcAutoNumAtCard(numAtCardRaw)) {
    payload.NumAtCard = numAtCardRaw.slice(0, 100);
  }

  // Branch only — line WH/UoM/tax come from base SQ.
  const branchRaw = input.documentBranchId ?? input.defaultBranchId;
  if (branchRaw != null && Number.isFinite(branchRaw) && branchRaw > 0) {
    payload.BPL_IDAssignedToInvoice = Math.trunc(branchRaw);
  }

  return payload;
};
