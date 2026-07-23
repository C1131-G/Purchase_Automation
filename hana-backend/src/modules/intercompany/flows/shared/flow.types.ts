// Shared flow input shapes.

export type IcDocumentLineInput = {
  ItemCode?: unknown;
  Quantity?: unknown;
  UnitPrice?: unknown;
  Price?: unknown;
  DiscountPercent?: unknown;
  UoMEntry?: unknown;
  UomEntry?: unknown;
  UoMCode?: unknown;
  UomCode?: unknown;
  VatGroup?: unknown;
  WarehouseCode?: unknown;
  LineNum?: unknown;
};

export type IcPqDraftHookInput = {
  dbName: string;
  docEntry: number;
  docNum?: number | null;
  cardCode: string;
  lines?: IcDocumentLineInput[];
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
