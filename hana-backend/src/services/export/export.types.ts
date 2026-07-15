// Shared types for document export service.

export type ExportFormat = "pdf" | "excel" | "word";

export interface ExportDocumentLine {
  lineNum: number;
  itemCode: string;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxCode: string;
  taxRate: number;
  lineTotal: number;
  warehouseCode: string;
  uomCode: string;
  openQty: number;
}

export interface ExportAttachment {
  fileName: string;
  fileExtension: string;
  freeText: string;
  attachmentDate: string;
}

export interface ExportDocumentData {
  entityLabel: string;
  docNum: number | string;
  docDate: string;
  docDueDate: string;
  cardCode: string;
  cardName: string;
  address: string;
  address2: string;
  numAtCard: string;
  comments: string;
  docCurr: string;
  docTotal: number;
  docStatus: string;
  salesPersonCode: string;
  discountAmount: number;
  discountPercent: number;
  lines: ExportDocumentLine[];
  attachments?: ExportAttachment[];
}

export function normalizeToExport(raw: Record<string, unknown>, label: string): ExportDocumentData {
  const lines = ((raw.DocumentLines as Record<string, unknown>[]) || []).map(
    (line: Record<string, unknown>, idx: number) => ({
      lineNum: Number(line.LineNum ?? idx),
      itemCode: String(line.ItemCode ?? ""),
      itemDescription: String(line.ItemDescription ?? ""),
      quantity: Number(line.Quantity ?? 0),
      unitPrice: Number(line.UnitPrice ?? line.Price ?? 0),
      discountPercent: Number(line.DiscountPercent ?? 0),
      taxCode: String(line.TaxCode ?? line.VatGroup ?? ""),
      taxRate: Number(line.VatPrcnt ?? line.TaxPercentagePerRow ?? 0),
      lineTotal: Number(line.LineTotal ?? 0),
      warehouseCode: String(line.WarehouseCode ?? ""),
      uomCode: String(line.UoMCode ?? ""),
      openQty: Number(line.OpenQty ?? 0),
    }),
  );

  const attachments = ((raw.attachments as Record<string, unknown>[]) || []).map((item) => ({
    fileName: String(item.fileName ?? ""),
    fileExtension: String(item.fileExtension ?? ""),
    freeText: String(item.freeText ?? item.remarks ?? ""),
    attachmentDate: String(item.attachmentDate ?? ""),
  }));

  return {
    entityLabel: label,
    docNum: (raw.DocNum ?? raw.id ?? "") as string | number,
    docDate: String(raw.DocDate ?? ""),
    docDueDate: String(raw.DocDueDate ?? ""),
    cardCode: String(raw.CardCode ?? ""),
    cardName: String(raw.CardName ?? ""),
    address: String(raw.Address ?? ""),
    address2: String(raw.Address2 ?? ""),
    numAtCard: String(raw.NumAtCard ?? ""),
    comments: String(raw.Comments ?? ""),
    docCurr: String(raw.DocCurr ?? ""),
    docTotal: Number(raw.DocTotal ?? 0),
    docStatus: String(raw.DocStatus ?? ""),
    salesPersonCode: String(raw.SalesPersonCode ?? ""),
    discountAmount: Number(raw.DiscountAmount ?? 0),
    discountPercent: Number(raw.DiscountPercent ?? 0),
    lines,
    attachments,
  };
}
