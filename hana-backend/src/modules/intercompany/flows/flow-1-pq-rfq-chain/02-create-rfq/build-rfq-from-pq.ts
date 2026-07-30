/**
 * Pure helpers: draft lines → RFQ line insert shape.
 */

import type { IcDocumentLineInput } from "@/modules/intercompany/flows/shared/flow.types";
import type { CreateRfqFromDraftInput } from "@/modules/intercompany/domain/rfq/rfq.types";

const toDateOnly = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const raw = String(value).trim();
  if (!raw) {
    return null;
  }
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw.slice(0, 10);
};

const toFiniteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

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
    // Prefer VatGroup (SAP); accept TaxCode aliases from portal payloads.
    const taxRaw = line.VatGroup ?? line.TaxCode ?? line.taxCode ?? null;
    const taxCode = taxRaw == null ? null : String(taxRaw).trim() || null;

    const descriptionRaw = line.ItemDescription ?? line.ItemName;
    const description =
      descriptionRaw === undefined || descriptionRaw === null
        ? null
        : String(descriptionRaw).trim() || null;

    // Quoted qty/date stay empty until seller fills RFQ — never copy from required.
    const quotedQty = toFiniteNumber(line.Quantity) ?? 0;
    const requiredQty =
      toFiniteNumber(line.RequiredQuantity) ?? toFiniteNumber(line.requiredQuantity) ?? 0;

    const requiredDate = toDateOnly(line.ReqDate ?? line.RequiredDate ?? line.requiredDate);
    const quotedDate = toDateOnly(line.ShipDate ?? line.QuotedDate ?? line.quotedDate);

    return {
      deliveryDate: quotedDate,
      description,
      discount:
        line.DiscountPercent === undefined || line.DiscountPercent === null
          ? 0
          : Number(line.DiscountPercent),
      itemCode: String(line.ItemCode ?? "").trim(),
      lineNum,
      quantity: quotedQty > 0 ? quotedQty : 0,
      requiredDate,
      requiredQuantity: requiredQty > 0 ? requiredQty : 0,
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

/** IC RFQ doc number: buyer PQ doc num when known, else PQ DocEntry (no RFQ-PQD- prefix). */
export const buildRfqNumber = (docEntry: number, docNum: string | null): string => {
  const trimmed = docNum != null ? String(docNum).trim() : "";
  if (trimmed) {
    return trimmed;
  }
  return String(docEntry);
};
