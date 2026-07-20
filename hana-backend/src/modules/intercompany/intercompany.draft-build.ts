import { DEFAULT_TARGET_BRANCH, SAP_OBJECT_TYPE_AR_INVOICE } from "./intercompany.constants";
import type { PoDocumentInput, PoDocumentLineInput } from "./intercompany.types";

const formatSapDate = (value: unknown): string | undefined => {
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

/** Copy PO line fields; tax/UoM remapped later in draft-tax-uom. */
const mapDocumentLine = (line: PoDocumentLineInput): Record<string, unknown> => {
  const docLine: Record<string, unknown> = {
    ItemCode: line.ItemCode as string,
    Quantity: line.Quantity as number,
    UnitPrice: (line.UnitPrice ?? line.Price) as number,
    DiscountPercent: Number(line.DiscountPercent ?? 0),
    VatGroup: line.VatGroup as string,
    WarehouseCode: line.WarehouseCode as string,
  };

  const uomEntry = Number(line.UoMEntry ?? line.UomEntry);
  if (Number.isFinite(uomEntry) && uomEntry > 0) {
    docLine.UoMEntry = Math.trunc(uomEntry);
  }
  const uomCode = line.UoMCode ?? line.UomCode;
  if (typeof uomCode === "number" || (typeof uomCode === "string" && uomCode.trim())) {
    docLine.UoMCode = uomCode as string | number;
  }

  return docLine;
};

export const buildFallbackNumAtCard = (sourceDb: string, poDocEntry: number): string =>
  `IC-PO:${sourceDb}:${poDocEntry}`;

/** Build AR Invoice Draft payload from PO (header + raw lines + default branch). */
export const transformPoToArInvoiceDraft = (params: {
  poPayload: PoDocumentInput;
  sourceDb: string;
  poDocEntry: number;
  targetCustomerCode: string;
}): Record<string, unknown> => {
  const { poPayload, sourceDb, poDocEntry, targetCustomerCode } = params;
  const lines = Array.isArray(poPayload.DocumentLines) ? poPayload.DocumentLines : [];

  const numAtCardRaw = poPayload.NumAtCard == null ? "" : String(poPayload.NumAtCard).trim();
  const numAtCard = numAtCardRaw || buildFallbackNumAtCard(sourceDb, poDocEntry);
  const docDate = formatSapDate(poPayload.DocDate);
  const docDueDate = formatSapDate(poPayload.DocDueDate) ?? docDate;

  return {
    DocObjectCode: SAP_OBJECT_TYPE_AR_INVOICE,
    CardCode: targetCustomerCode,
    DocDate: docDate,
    DocDueDate: docDueDate,
    Comments: poPayload.Comments,
    NumAtCard: numAtCard,
    BPL_IDAssignedToInvoice: DEFAULT_TARGET_BRANCH,
    DocumentLines: lines.map(mapDocumentLine),
  };
};
