// Response Transformer: Converts camelCase Drizzle rows to PascalCase SAP-style format
// that the frontend expects. Also maps status codes ("O"/"C"/"D"/"P") to labels.

export type StatusMap = Record<string, string>;

const STATUS_MAP: StatusMap = {
  O: "Open",
  C: "Closed",
  D: "Draft",
  P: "Partial",
};

const statusToLabel = (val: string | undefined | null): string => {
  if (!val) return "Open";
  return STATUS_MAP[val] ?? val;
};

// Common field maps for document tables
const DOC_FIELD_MAP: Record<string, string> = {
  cardCode: "CardCode",
  cardName: "CardName",
  docCurrency: "DocCurr",
  docDate: "DocDate",
  docDueDate: "DocDueDate",
  docNum: "DocNum",
  docTotal: "DocTotal",
  docStatus: "DocStatus",
  numAtCard: "NumAtCard",
  paidToDate: "paidToDate",
  balanceDue: "BalanceDue",
  counterRef: "CounterRef",
  paymentMode: "PaymentMode",
  comments: "Comments",
  filler: "Filler",
  jrnlMemo: "JrnlMemo",
  toWarehouseCode: "ToWhsCode",
  taxDate: "TaxDate",
  docEntry: "DocEntry",
  address: "Address",
  address2: "Address2",
  salesPersonCode: "SalesPersonCode",
  attachmentEntry: "attachmentEntry",
  canceled: "canceled",
  lines: "DocumentLines",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  docNumStart: "DocNumStart",
  docNumEnd: "DocNumEnd",
};

// Line item field maps
const LINE_FIELD_MAP: Record<string, string> = {
  docEntry: "DocEntry",
  lineNum: "LineNum",
  itemCode: "ItemCode",
  itemDescription: "ItemDescription",
  quantity: "Quantity",
  unitPrice: "UnitPrice",
  price: "Price",
  discountPercent: "DiscountPercent",
  vatGroup: "VatGroup",
  vatPercent: "VatPrcnt",
  warehouseCode: "WarehouseCode",
  uomCode: "UoMCode",
  uomEntry: "UoMEntry",
  lineTotal: "LineTotal",
  baseEntry: "BaseEntry",
  baseLine: "BaseLine",
  baseType: "BaseType",
  openQty: "OpenQty",
  openQuantity: "OpenQuantity",
  remainingOpenQuantity: "RemainingOpenQuantity",
  taxCode: "TaxCode",
  acctCode: "AcctCode",
  fromWarehouseCode: "FromWarehouseCode",
  dscription: "Dscription",
  lineStatus: "LineStatus",
  requiredDate: "ReqDate",
  requiredQuantity: "RequiredQuantity",
  grossTotal: "GrossTotal",
  netTotal: "NetTotal",
  taxAmount: "TaxAmount",
};

// Item master field maps
const ITEM_FIELD_MAP: Record<string, string> = {
  code: "ItemCode",
  name: "ItemName",
  foreignName: "FrgnName",
  itemGroupCode: "ItmsGrpCod",
  inventoryUom: "InvntryUom",
  onHand: "OnHand",
  isCommitted: "IsCommited",
  onOrder: "OnOrder",
  avgPrice: "AvgPrice",
  lastPurchasePrice: "LastPurPrc",
  lastPurchaseDate: "LastPurDat",
  barcode: "CodeBars",
  frozen: "frozenFor",
  inventoryItem: "InvntItem",
  purchaseItem: "purchaseItem",
  salesItem: "salesItem",
  defaultWarehouse: "DfltWH",
};

// Fields that should be parsed to numbers
const NUMERIC_FIELDS = new Set([
  "id",
  "DocNum",
  "DocEntry",
  "Quantity",
  "UnitPrice",
  "Price",
  "LineTotal",
  "DiscountPercent",
  "VatPrcnt",
  "OnHand",
  "IsCommited",
  "OnOrder",
  "AvgPrice",
  "LastPurPrc",
  "ItmsGrpCod",
  "LineNum",
  "BaseEntry",
  "BaseLine",
  "BaseType",
  "OpenQty",
  "RequiredQuantity",
  "UoMEntry",
  "SalesPersonCode",
  "attachmentEntry",
  "DocTotal",
  "paidToDate",
  "BalanceDue",
]);

const DOC_STATUS_FIELDS = new Set(["DocStatus", "LineStatus"]);

// Fields that should remain camelCase even in PascalCase responses
const KEEP_CAMELCASE = new Set([
  "paidToDate",
  "attachmentEntry",
  "canceled",
  "createdAt",
  "updatedAt",
]);

const parseNumber = (val: unknown): number => {
  if (typeof val === "number") return val;
  if (typeof val === "string" && val.trim() !== "") {
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
};

const transformRow = (row: Record<string, unknown>): Record<string, unknown> => {
  if (!row || typeof row !== "object") return row;

  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    // Item master special handling
    if (key in ITEM_FIELD_MAP) {
      const mapped = ITEM_FIELD_MAP[key];
      if (mapped && mapped.length > 0) {
        output[mapped] = value;
      }
      continue;
    }

    // Document field handling
    if (key in DOC_FIELD_MAP) {
      const mapped = DOC_FIELD_MAP[key];
      if (mapped && mapped.length > 0) {
        if (DOC_STATUS_FIELDS.has(mapped)) {
          output[mapped] = statusToLabel(String(value));
        } else if (NUMERIC_FIELDS.has(mapped) && !KEEP_CAMELCASE.has(mapped)) {
          output[mapped] = parseNumber(value);
        } else if (mapped === "DocTotal" && !KEEP_CAMELCASE.has(mapped)) {
          output[mapped] = parseNumber(value);
        } else {
          output[mapped] = value;
        }
      }
      continue;
    }

    // Lines array → transform each line
    if (key === "lines" && Array.isArray(value)) {
      output.DocumentLines = value.map((line: Record<string, unknown>) => transformLineItem(line));
      continue;
    }

    // Passthrough for fields without explicit mapping
    output[key] = value;
  }

  // Handle numeric strings in common fields
  if ("DocTotal" in output && typeof output.DocTotal === "string") {
    output.DocTotal = parseNumber(output.DocTotal);
  }
  if ("id" in output) {
    output.id = parseNumber(output.id);
  }

  return output;
};

const transformLineItem = (line: Record<string, unknown>): Record<string, unknown> => {
  if (!line || typeof line !== "object") return line;

  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(line)) {
    if (key in LINE_FIELD_MAP) {
      const mapped = LINE_FIELD_MAP[key];
      if (mapped && mapped.length > 0) {
        if (mapped === "DocStatus" || mapped === "LineStatus") {
          output[mapped] = statusToLabel(String(value));
        } else if (NUMERIC_FIELDS.has(mapped)) {
          output[mapped] = parseNumber(value);
        } else {
          output[mapped] = value;
        }
      }
      continue;
    }
    // Passthrough
    output[key] = value;
  }

  return output;
};

/** Transform a single document row from camelCase to PascalCase */
export const toPascalCase = (row: Record<string, unknown>): Record<string, unknown> => {
  return transformRow(row);
};

/** Transform a paginated list result from camelCase to PascalCase */
export const toPascalCaseList = (result: {
  data: Record<string, unknown>[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}): {
  data: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} => {
  const transformed = {
    data: (result.data || []).map((row) => transformRow(row)),
    total: result.total ?? 0,
    page: result.page ?? 1,
    limit: result.limit ?? 20,
    totalPages: result.totalPages ?? 1,
  };
  return transformed;
};

/** Transform a raw docnums array (returns array of docnum values) */
export const toPascalCaseDocnums = (rows: unknown[]): { code: string; name: string }[] => {
  if (!Array.isArray(rows)) return [];
  return rows.map((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>;
      const code = String(obj.docNum ?? obj.code ?? "");
      const name = String(obj.name ?? obj.code ?? obj.docNum ?? "");
      return { code, name };
    }
    const s = String(item);
    return { code: s, name: s };
  });
};
