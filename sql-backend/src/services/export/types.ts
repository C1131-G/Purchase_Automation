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
  data: Record<string, any>[];
  filename?: string;
}

const safeStr = (v: unknown): string => String(v ?? "");

const safeNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

export const normalizeToExport = (
  doc: Record<string, any>,
  lines: Record<string, any>[],
  attachments: Record<string, any>[],
): ExportDocumentData => ({
  title: doc.docType ?? "Document",
  docNum: safeNum(doc.docNum),
  docDate: safeStr(doc.docDate),
  docDueDate: safeStr(doc.docDueDate) || null,
  cardCode: safeStr(doc.cardCode),
  cardName: safeStr(doc.cardName),
  address: safeStr(doc.address),
  docTotal: safeNum(doc.docTotal),
  docCurrency: safeStr(doc.docCurrency),
  docStatus: safeStr(doc.docStatus),
  comments: safeStr(doc.comments) || null,
  lines: lines.map((l, i) => ({
    lineNum: safeNum(l.lineNum ?? i + 1),
    itemCode: safeStr(l.itemCode),
    itemDescription: safeStr(l.itemDescription ?? l.dscription),
    quantity: safeNum(l.quantity),
    uom: safeStr(l.uom),
    price: safeNum(l.price),
    total: safeNum(l.total),
    warehouse: safeStr(l.warehouse),
    taxCode: safeStr(l.taxCode),
  })),
  attachments: attachments.map((a) => ({
    fileName: safeStr(a.fileName),
    fileExtension: safeStr(a.fileExtension),
    freeText: safeStr(a.freeText) || null,
    attachmentDate: safeStr(a.attachmentDate) || null,
  })),
});
