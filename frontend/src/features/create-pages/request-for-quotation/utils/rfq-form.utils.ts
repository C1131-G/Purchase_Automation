import type {
  IcRfqHeader,
  IcRfqLine,
  IcUpdateRfqLineBody,
} from "@/features/intercompany/schemas/intercompany-api.schema";
import type {
  CreateLookupOption,
  ProductRow,
} from "@/features/create-pages/create-shared/utils/create-order.types";
import { calculateOrderTotals } from "@/features/create-pages/create-shared/utils/create-order.calculations";
import {
  mapTaxCodeForSide,
  taxRateForCode,
} from "@/features/create-pages/create-shared/utils/product-tax-codes";
import {
  capQuantityToMax,
  parseDocumentLineQuantity,
} from "@/features/create-pages/create-shared/utils/document-line-quantity";
import { parseNumericDraft } from "@/shared/validation/numeric-input.validation";

export type RfqEditableLine = {
  deliveryDate: string;
  description: string;
  /** Discount percent as input string (0–100). */
  discount: string;
  itemCode: string;
  lineNum: number;
  /** Quoted quantity as input string so partial typing works. */
  quantity: string;
  remarks: string;
  rfqLineId: number;
  taxCode: string;
  unitPrice: string;
  uomCode: string;
  warehouse: string;
};

/** Fields the seller may change on a DRAFT RFQ. */
export type RfqSellerEditableFields = Pick<
  RfqEditableLine,
  "unitPrice" | "quantity" | "discount" | "deliveryDate"
>;

/** ProductRow patches allowed on RFQ seller fill. Tax code is remapped sales-side, not seller-typed. */
export type RfqSellerProductPatch = Pick<
  ProductRow,
  | "price"
  | "quantity"
  | "discountPercent"
  | "discountAmount"
  | "quotedDate"
  | "taxRate"
  | "vatGroup"
>;

export const isRfqDraft = (status: string | undefined): boolean =>
  String(status ?? "")
    .trim()
    .toUpperCase() === "DRAFT";

export const isRfqSubmitted = (status: string | undefined): boolean =>
  String(status ?? "")
    .trim()
    .toUpperCase() === "SUBMITTED";

export const isRfqCompleted = (status: string | undefined): boolean =>
  String(status ?? "")
    .trim()
    .toUpperCase() === "COMPLETED";

/** DRAFT always; COMPLETED until the buyer PQ is copied to a PO. */
export const canEditRfqLines = (status: string | undefined, pqCopiedToPo?: boolean): boolean =>
  isRfqDraft(status) || (isRfqCompleted(status) && pqCopiedToPo !== true);

const toDateInputValue = (value: string | null | undefined): string => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }
  // Accept ISO datetime or date-only.
  return raw.slice(0, 10);
};

const formatNumberInput = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }
  return String(value);
};

export const mapRfqLinesToEditable = (lines: IcRfqLine[] | undefined): RfqEditableLine[] => {
  if (!lines?.length) {
    return [];
  }

  const mapped = lines.map((line) => ({
    deliveryDate: toDateInputValue(line.deliveryDate),
    description: String(line.description ?? "").trim(),
    discount: formatNumberInput(line.discount),
    itemCode: String(line.itemCode ?? "").trim(),
    lineNum: line.lineNum,
    quantity: formatNumberInput(line.quantity),
    remarks: String(line.remarks ?? "").trim(),
    rfqLineId: line.rfqLineId,
    taxCode: String(line.taxCode ?? "").trim(),
    unitPrice: formatNumberInput(line.unitPrice),
    uomCode: String(line.sqUomCode ?? line.uomCode ?? "").trim(),
    warehouse: String(line.warehouse ?? "").trim(),
  }));

  return mapped.sort((a, b) => a.lineNum - b.lineNum);
};

/** Map IC RFQ lines into PQ-style product rows for the shared create table. */
export const mapRfqLinesToProductRows = (lines: IcRfqLine[] | undefined): ProductRow[] => {
  if (!lines?.length) {
    return [];
  }

  const qty = (value: number | null | undefined) =>
    value === null || value === undefined || !Number.isFinite(value) ? 0 : Number(value);
  const price = (value: number | null | undefined) =>
    value === null || value === undefined || !Number.isFinite(value) ? 0 : Number(value);
  const disc = (value: number | null | undefined) =>
    value === null || value === undefined || !Number.isFinite(value) ? 0 : Number(value);

  return [...lines]
    .sort((a, b) => a.lineNum - b.lineNum)
    .map((line) => {
      // Quoted qty/date stay empty until seller fills them — never copy from required.
      const quantity = qty(line.quantity);
      const requiredQty =
        line.requiredQuantity !== null &&
        line.requiredQuantity !== undefined &&
        Number.isFinite(line.requiredQuantity)
          ? Number(line.requiredQuantity)
          : 0;
      const unitPrice = price(line.unitPrice);
      const discountPercent = disc(line.discount);
      const gross = unitPrice * quantity;
      const discountAmount =
        discountPercent > 0 ? Math.round(((gross * discountPercent) / 100) * 100) / 100 : 0;
      // deliveryDate is quoted date only (not required date).
      const quotedDate = toDateInputValue(line.deliveryDate);
      const requiredDate = toDateInputValue(line.requiredDate);
      const itemCode = String(line.itemCode ?? "").trim();
      const description = String(line.description ?? "").trim();
      const salesUom = String(line.sqUomCode ?? line.uomCode ?? "").trim();
      const salesUomEntry =
        line.sqUomEntry != null && Number.isFinite(line.sqUomEntry) && line.sqUomEntry > 0
          ? Math.trunc(line.sqUomEntry)
          : undefined;

      return {
        comment: String(line.remarks ?? "").trim(),
        currency: "",
        discountAmount,
        discountPercent,
        id: String(line.rfqLineId),
        lineNum: line.lineNum,
        price: unitPrice,
        productCode: itemCode,
        productName: description || itemCode,
        quantity,
        requiredDate: requiredDate || undefined,
        // Buyer snapshot — stay locked; do not update when seller revises quoted qty.
        requiredQuantity: requiredQty,
        quotedDate: quotedDate || undefined,
        stock: 0,
        taxRate: 0,
        // Seller sales UoM when enrich resolved it; else buyer PQ snapshot.
        uomCode: salesUom || undefined,
        uomEntry: salesUomEntry,
        salesUomCode: salesUom || undefined,
        salesUomEntry,
        uomList: salesUom
          ? [{ code: salesUom, name: salesUom, uomEntry: salesUomEntry }]
          : undefined,
        // Seller sales tax when enrich resolved it; else buyer purchase snapshot
        // (table remaps I→O by OVTG rate for display).
        vatGroup: String(line.sqTaxCode ?? line.taxCode ?? "").trim(),
        warehouseCode: String(line.warehouse ?? "").trim(),
      } satisfies ProductRow;
    });
};

/**
 * Map every RFQ line onto seller sales tax + OVTG rate so Tax Total / Grand Total
 * include tax even for virtualized (unmounted) rows.
 */
export const applyRfqSalesTaxToRows = (
  rows: ProductRow[],
  taxCodes: CreateLookupOption[],
): ProductRow[] => {
  if (rows.length === 0 || taxCodes.length === 0) {
    return rows;
  }

  let changed = false;
  const next = rows.map((row) => {
    const vatGroup = mapTaxCodeForSide(taxCodes, row.vatGroup, "sales") || row.vatGroup;
    const taxRate = taxRateForCode(taxCodes, vatGroup);
    if (vatGroup === row.vatGroup && taxRate === row.taxRate) {
      return row;
    }
    changed = true;
    return { ...row, taxRate, vatGroup };
  });
  return changed ? next : rows;
};

export const productRowsFingerprint = (rows: ProductRow[]): string =>
  rows
    .map(
      (row) =>
        `${row.id}:${row.price}:${row.quantity}:${row.discountPercent}:${row.quotedDate ?? ""}`,
    )
    .join("|");

export const parseOptionalNumber = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  return parseNumericDraft(trimmed, "sapDecimal") ?? null;
};

/** Gross line amount before discount. */
export const computeLineGross = (unitPrice: number, quantity: number): number => {
  const gross = unitPrice * quantity;
  if (!Number.isFinite(gross)) {
    return 0;
  }
  return Math.round(gross * 100) / 100;
};

/** Discount amount from unit price × qty × disc%. */
export const computeDiscountAmount = (
  unitPrice: number,
  quantity: number,
  discountPercent: number,
): number => {
  if (!Number.isFinite(unitPrice) || !Number.isFinite(quantity) || discountPercent <= 0) {
    return 0;
  }
  const gross = unitPrice * quantity;
  if (!Number.isFinite(gross) || gross <= 0) {
    return 0;
  }
  return Math.round(((gross * discountPercent) / 100) * 100) / 100;
};

/** Convert a typed disc amount back to percent (clamped 0–100). */
export const discountPercentFromAmount = (
  unitPrice: number,
  quantity: number,
  discountAmount: number,
): number | null => {
  if (!Number.isFinite(discountAmount) || discountAmount < 0) {
    return null;
  }
  const gross = unitPrice * quantity;
  if (!Number.isFinite(gross) || gross <= 0) {
    return discountAmount === 0 ? 0 : null;
  }
  const percent = (discountAmount / gross) * 100;
  if (!Number.isFinite(percent)) {
    return null;
  }
  return Math.min(100, Math.max(0, Math.round(percent * 100) / 100));
};

/**
 * Build PUT body for seller fill.
 * - `requireAllPrices: true` (submit): every line needs unit price > 0, quoted qty > 0, quoted date.
 * - `requireAllPrices: false` (save): only lines with a unit price are sent (partial OK).
 */
export const buildUpdateRfqLinesPayload = (
  lines: RfqEditableLine[],
  options?: { requireAllPrices?: boolean },
): { lines: IcUpdateRfqLineBody[]; errors: string[] } => {
  const requireAllPrices = options?.requireAllPrices === true;
  const payload: IcUpdateRfqLineBody[] = [];
  const errors: string[] = [];

  for (const line of lines) {
    const unitPrice = parseOptionalNumber(line.unitPrice);
    // Unchanged / empty price maps to null — 0 is not a filled quote price.
    if (unitPrice === null || unitPrice <= 0) {
      if (requireAllPrices) {
        errors.push(`Line ${line.lineNum}: unit price is required`);
      }
      continue;
    }

    const quantity = parseOptionalNumber(line.quantity);
    if (quantity === null || quantity <= 0) {
      errors.push(`Line ${line.lineNum}: quoted quantity must be greater than 0`);
      continue;
    }

    const discount = parseOptionalNumber(line.discount);
    if (discount !== null && (discount < 0 || discount > 100)) {
      errors.push(`Line ${line.lineNum}: discount must be between 0 and 100`);
      continue;
    }

    const deliveryDate = line.deliveryDate.trim();
    if (requireAllPrices && !deliveryDate) {
      errors.push(`Line ${line.lineNum}: quoted date is required`);
      continue;
    }

    payload.push({
      deliveryDate: deliveryDate || null,
      discount,
      lineNum: line.lineNum,
      quantity,
      unitPrice,
    });
    // Intentionally omit taxCode — IC_RFQ_LINE.TAX_CODE stays the buyer purchase snapshot.
  }

  if (!requireAllPrices && payload.length === 0 && lines.length > 0) {
    errors.push("Enter at least one unit price before saving.");
  }

  return { errors, lines: payload };
};

/** Commit quantity drafts and cap quoted qty to buyer required qty. */
export const applyRfqQuotedQtyCap = (
  rows: ProductRow[],
  drafts?: Record<string, { quantity?: string }>,
): ProductRow[] =>
  rows.map((row) => {
    const draft = drafts?.[row.id]?.quantity;
    let quantity = row.quantity;
    if (draft !== undefined) {
      quantity = parseDocumentLineQuantity(draft);
    }
    quantity = capQuantityToMax(quantity, row.requiredQuantity);
    if (quantity === row.quantity) {
      return row;
    }
    return { ...row, quantity };
  });

/** Build seller-fill PUT body from PQ-style product rows. */
export const buildUpdateRfqLinesPayloadFromProductRows = (
  rows: ProductRow[],
  options?: { requireAllPrices?: boolean },
): { lines: IcUpdateRfqLineBody[]; errors: string[] } => {
  const requireAllPrices = options?.requireAllPrices === true;
  const payload: IcUpdateRfqLineBody[] = [];
  const errors: string[] = [];

  for (const row of rows) {
    const lineNum = row.lineNum ?? 0;
    // Product rows default null SAP price to 0 — treat 0 as "not filled" on submit.
    const unitPrice = Number(row.price);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      if (requireAllPrices) {
        errors.push(`Line ${lineNum}: unit price is required`);
      }
      continue;
    }

    const quantity = capQuantityToMax(Number(row.quantity), row.requiredQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push(`Line ${lineNum}: quoted quantity must be greater than 0`);
      continue;
    }

    const discount = Number(row.discountPercent);
    if (Number.isFinite(discount) && (discount < 0 || discount > 100)) {
      errors.push(`Line ${lineNum}: discount must be between 0 and 100`);
      continue;
    }

    const deliveryDate = String(row.quotedDate ?? "").trim();
    if (requireAllPrices && !deliveryDate) {
      errors.push(`Line ${lineNum}: quoted date is required`);
      continue;
    }

    payload.push({
      deliveryDate: deliveryDate || null,
      discount: Number.isFinite(discount) ? discount : 0,
      lineNum,
      quantity,
      unitPrice,
    });
    // Do not write vatGroup/taxCode — tax is item-based on the buyer snapshot.
  }

  if (!requireAllPrices && payload.length === 0 && rows.length > 0) {
    errors.push("Enter at least one unit price before saving.");
  }

  if (requireAllPrices && rows.length > 0 && payload.length === 0 && errors.length === 0) {
    errors.push("Fill quoted quantity, quoted date, and price on all lines before submit.");
  }

  return { errors, lines: payload };
};

/** True when every RFQ line has quoted qty, quoted date, and price for submit. */
export const isRfqReadyToSubmit = (rows: ProductRow[]): boolean => {
  if (rows.length === 0) {
    return false;
  }
  return (
    buildUpdateRfqLinesPayloadFromProductRows(rows, { requireAllPrices: true }).errors.length === 0
  );
};

export type RfqSellerRequiredField = "price" | "quantity" | "quotedDate";

/** Per-line missing quote fields (for red borders after submit attempt). */
export type RfqLineFieldErrors = Record<string, Partial<Record<RfqSellerRequiredField, true>>>;

export const getRfqLineFieldErrors = (rows: ProductRow[]): RfqLineFieldErrors => {
  const result: RfqLineFieldErrors = {};
  for (const row of rows) {
    const fields: Partial<Record<RfqSellerRequiredField, true>> = {};
    if (!Number.isFinite(Number(row.price)) || Number(row.price) <= 0) {
      fields.price = true;
    }
    if (!Number.isFinite(Number(row.quantity)) || Number(row.quantity) <= 0) {
      fields.quantity = true;
    }
    if (!String(row.quotedDate ?? "").trim()) {
      fields.quotedDate = true;
    }
    if (Object.keys(fields).length > 0) {
      result[row.id] = fields;
    }
  }
  return result;
};

export const computeRfqProductTotals = (rows: ProductRow[]) => calculateOrderTotals(rows);

export const computeLineNet = (unitPrice: number, quantity: number, discountPercent: number) => {
  const gross = unitPrice * quantity;
  if (!Number.isFinite(gross)) {
    return 0;
  }
  if (discountPercent > 0) {
    return Math.round(((gross * (100 - discountPercent)) / 100) * 100) / 100;
  }
  return Math.round(gross * 100) / 100;
};

export const computeRfqTotals = (lines: RfqEditableLine[]) => {
  let netTotal = 0;
  for (const line of lines) {
    const unitPrice = parseOptionalNumber(line.unitPrice) ?? 0;
    const quantity = parseOptionalNumber(line.quantity) ?? 0;
    const discount = parseOptionalNumber(line.discount) ?? 0;
    netTotal += computeLineNet(unitPrice, quantity, discount);
  }
  return {
    lineCount: lines.length,
    netTotal: Math.round(netTotal * 100) / 100,
  };
};

export const rfqStatusBadgeClass = (status: string | undefined): string => {
  const normalized = String(status ?? "")
    .trim()
    .toUpperCase();
  switch (normalized) {
    case "DRAFT":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "SUBMITTED":
      return "border-teal-200 bg-teal-50 text-teal-800";
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "CANCELLED":
      return "border-linen-200 bg-linen-100 text-neutral-500";
    default:
      return "border-linen-200 bg-linen-50 text-ink-900";
  }
};

export type RfqHeaderMeta = Pick<
  IcRfqHeader,
  | "createdBy"
  | "pqDraftDocEntry"
  | "pqDraftDocNum"
  | "remarks"
  | "rfqId"
  | "rfqNumber"
  | "sourceCompanyId"
  | "status"
  | "targetCompanyId"
  | "vendorCode"
>;
