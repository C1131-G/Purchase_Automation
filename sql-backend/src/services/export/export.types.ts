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

const safeStr = (rawValue: unknown): string => String(rawValue ?? "");

const safeNum = (rawValue: unknown): number => {
  const numeric = Number(rawValue);
  return Number.isNaN(numeric) ? 0 : numeric;
};

export const normalizeToExport = (
  doc: Record<string, unknown>,
  lines: Record<string, unknown>[],
  attachments: Record<string, unknown>[],
): ExportDocumentData => ({
  address: safeStr(doc.address),
  attachments: attachments.map((attachment) => ({
    attachmentDate: safeStr(attachment.attachmentDate) || null,
    fileExtension: safeStr(attachment.fileExtension),
    fileName: safeStr(attachment.fileName),
    freeText: safeStr(attachment.freeText) || null,
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
  lines: lines.map((line, i) => ({
    itemCode: safeStr(line.itemCode),
    itemDescription: safeStr(line.itemDescription ?? line.dscription),
    lineNum: safeNum(line.lineNum ?? i + 1),
    price: safeNum(line.price),
    quantity: safeNum(line.quantity),
    taxCode: safeStr(line.taxCode),
    total: safeNum(line.total),
    uom: safeStr(line.uom),
    warehouse: safeStr(line.warehouse),
  })),
  title: safeStr(doc.docType) || "Document",
});
