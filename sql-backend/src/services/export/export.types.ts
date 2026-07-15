// Export types: Shared type definitions for all export generators.

export type ExportFormat = "excel" | "pdf" | "word";

export interface ExportDocumentLine {
  lineNum: number;
  itemCode: string;
  itemDescription: string;
  quantity: number;
  uom: string;
  price: number;
  total: number;
  warehouse: string;
  taxCode: string;
}

export interface ExportAttachment {
  fileName: string;
  fileExtension: string;
  freeText: string | null;
  attachmentDate: string | null;
}

export interface ExportDocumentData {
  title: string;
  docNum: number;
  docDate: string;
  docDueDate: string | null;
  cardCode: string;
  cardName: string;
  address: string;
  docTotal: number;
  docCurrency: string;
  docStatus: string;
  comments: string | null;
  lines: ExportDocumentLine[];
  attachments: ExportAttachment[];
}

export interface ExportOptions {
  title: string;
  columns: { header: string; key: string; width?: number }[];
  data: Record<string, unknown>[];
  filename?: string;
}

const safeStr = (v: unknown): string => String(v ?? "");

const safeNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

export const normalizeToExport = (
  doc: Record<string, unknown>,
  lines: Record<string, unknown>[],
  attachments: Record<string, unknown>[],
): ExportDocumentData => ({
  address: safeStr(doc.address),
  attachments: attachments.map((a) => ({
    attachmentDate: safeStr(a.attachmentDate) || null,
    fileExtension: safeStr(a.fileExtension),
    fileName: safeStr(a.fileName),
    freeText: safeStr(a.freeText) || null,
  })),
  cardCode: safeStr(doc.cardCode),
  cardName: safeStr(doc.cardName),
  comments: safeStr(doc.comments) || null,
  docCurrency: safeStr(doc.docCurrency),
  docDate: safeStr(doc.docDate),
  docDueDate: safeStr(doc.docDueDate) || null,
  docNum: safeNum(doc.docNum),
  docStatus: safeStr(doc.docStatus),
  docTotal: safeNum(doc.docTotal),
  lines: lines.map((l, i) => ({
    itemCode: safeStr(l.itemCode),
    itemDescription: safeStr(l.itemDescription ?? l.dscription),
    lineNum: safeNum(l.lineNum ?? i + 1),
    price: safeNum(l.price),
    quantity: safeNum(l.quantity),
    taxCode: safeStr(l.taxCode),
    total: safeNum(l.total),
    uom: safeStr(l.uom),
    warehouse: safeStr(l.warehouse),
  })),
  title: safeStr(doc.docType) || "Document",
});
