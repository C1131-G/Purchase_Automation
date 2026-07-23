/**
 * Pure helpers: draft lines → RFQ line insert shape.
 */

import type { IcDocumentLineInput } from "@/modules/intercompany/flows/shared/flow.types";
import type { CreateRfqFromDraftInput } from "@/modules/intercompany/domain/rfq/rfq.types";

export const mapDraftLinesToRfqLines = (
  lines: IcDocumentLineInput[] | undefined,
): CreateRfqFromDraftInput["lines"] => {
  if (!Array.isArray(lines) || lines.length === 0) {
    return [];
  }

  return lines.map((line, index) => {
    const lineNum =
      line.LineNum !== undefined && line.LineNum !== null && Number.isFinite(Number(line.LineNum))
        ? Number(line.LineNum)
        : index;

    const unitPriceRaw = line.UnitPrice ?? line.Price;
    const unitPrice =
      unitPriceRaw === undefined || unitPriceRaw === null ? null : Number(unitPriceRaw);

    const uomCode = line.UoMCode ?? line.UomCode;
    const taxCode = line.VatGroup == null ? null : String(line.VatGroup).trim() || null;

    return {
      description: null,
      discount:
        line.DiscountPercent === undefined || line.DiscountPercent === null
          ? 0
          : Number(line.DiscountPercent),
      itemCode: String(line.ItemCode ?? "").trim(),
      lineNum,
      quantity: Number(line.Quantity ?? 0),
      taxCode,
      unitPrice: Number.isFinite(unitPrice as number) ? (unitPrice as number) : null,
      uomCode: uomCode === undefined || uomCode === null || uomCode === "" ? null : String(uomCode),
      warehouse:
        line.WarehouseCode === undefined || line.WarehouseCode === null
          ? null
          : String(line.WarehouseCode),
    };
  });
};

export const buildRfqNumber = (docEntry: number, docNum: string | null): string => {
  if (docNum) {
    return `RFQ-PQD-${docNum}`;
  }
  return `RFQ-PQD-E${docEntry}`;
};
