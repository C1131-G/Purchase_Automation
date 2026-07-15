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

const safeStr = (rawValue: unknown): string => String(rawValue ?? "");

const safeNum = (rawValue: unknown): number => {
  const numeric = Number(rawValue);
  return Number.isNaN(numeric) ? 0 : numeric;
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
  lines: lines.map((line, i) => ({
    lineNum: safeNum(line.lineNum ?? i + 1),
    itemCode: safeStr(line.itemCode),
    itemDescription: safeStr(line.itemDescription ?? line.dscription),
    quantity: safeNum(line.quantity),
    uom: safeStr(line.uom),
    price: safeNum(line.price),
    total: safeNum(line.total),
    warehouse: safeStr(line.warehouse),
    taxCode: safeStr(line.taxCode),
  })),
  attachments: attachments.map((attachment) => ({
    fileName: safeStr(attachment.fileName),
    fileExtension: safeStr(attachment.fileExtension),
    freeText: safeStr(attachment.freeText) || null,
    attachmentDate: safeStr(attachment.attachmentDate) || null,
  })),
});
