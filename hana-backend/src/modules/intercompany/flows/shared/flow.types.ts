// Shared flow input shapes.

export type IcDocumentLineInput = {
  ItemCode?: unknown;
  ItemDescription?: unknown;
  ItemName?: unknown;
  Quantity?: unknown;
  RequiredQuantity?: unknown;
  requiredQuantity?: unknown;
  UnitPrice?: unknown;
  Price?: unknown;
  DiscountPercent?: unknown;
  UoMEntry?: unknown;
  UomEntry?: unknown;
  UoMCode?: unknown;
  UomCode?: unknown;
  VatGroup?: unknown;
  /** Alias of VatGroup from some portal payloads. */
  TaxCode?: unknown;
  taxCode?: unknown;
  WarehouseCode?: unknown;
  LineNum?: unknown;
  ReqDate?: unknown;
  RequiredDate?: unknown;
  requiredDate?: unknown;
  ShipDate?: unknown;
  QuotedDate?: unknown;
  quotedDate?: unknown;
};

export type IcPqDraftHookInput = {
  dbName: string;
  docEntry: number;
  docNum?: number | null;
  cardCode: string;
  lines?: IcDocumentLineInput[];
  /** Optional header snapshot from PQ draft save (buyer, dates, addresses). */
  cardName?: string | null;
  salesPersonCode?: number | string | null;
  docDate?: unknown;
  docDueDate?: unknown;
  requiredDate?: unknown;
  address?: string | null;
  address2?: string | null;
  numAtCard?: string | null;
  comments?: string | null;
};

export type IcPoHookInput = {
  dbName: string;
  docEntry: number;
  docNum?: number | null;
  cardCode: string;
  /** When true, Flow 2 must skip (draft PO is not automation-eligible). */
  isDraft?: boolean;
  docDate?: unknown;
  docDueDate?: unknown;
  numAtCard?: unknown;
  lines?: IcDocumentLineInput[];
  totals?: unknown;
  currency?: string;
  remarks?: string;
};
