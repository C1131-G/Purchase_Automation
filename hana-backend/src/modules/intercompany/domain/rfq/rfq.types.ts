export type IcRfqStatus = "DRAFT" | "SUBMITTED" | "COMPLETED" | "CANCELLED";

export type IcRfqLine = {
  rfqLineId: number;
  rfqId: number;
  lineNum: number;
  itemCode: string;
  description: string | null;
  /** Quoted quantity (seller-editable). */
  quantity: number;
  unitPrice: number | null;
  discount: number | null;
  taxCode: string | null;
  /** Quoted / ship date (seller-editable). */
  deliveryDate: string | null;
  warehouse: string | null;
  uomCode: string | null;
  remarks: string | null;
  /** Buyer required qty snapshot (display / locked). Enriched from PQ draft when missing. */
  requiredQuantity?: number | null;
  /** Buyer required date snapshot (display / locked). */
  requiredDate?: string | null;
};

export type IcRfqHeader = {
  rfqId: number;
  rfqNumber: string;
  sourceCompanyId: number;
  targetCompanyId: number;
  pqDraftDocEntry: number;
  pqDraftDocNum: number | null;
  vendorCode: string;
  status: IcRfqStatus | string;
  remarks: string | null;
  createdBy: string | null;
  lines?: IcRfqLine[];
  /** Enriched from source PQ draft (ODRF) — display only. */
  vendorName?: string | null;
  buyerName?: string | null;
  buyerCode?: string | null;
  docDate?: string | null;
  docDueDate?: string | null;
  requiredDate?: string | null;
  billToAddress?: string | null;
  shipToAddress?: string | null;
  warehouseCode?: string | null;
  vendorRefNo?: string | null;
};

export type CreateRfqFromDraftInput = {
  sourceCompanyId: number;
  targetCompanyId: number;
  pqDraftDocEntry: number;
  pqDraftDocNum?: number | null;
  vendorCode: string;
  rfqNumber: string;
  remarks?: string | null;
  createdBy?: string | null;
  lines: Array<{
    lineNum: number;
    itemCode: string;
    description?: string | null;
    quantity: number;
    unitPrice?: number | null;
    discount?: number | null;
    taxCode?: string | null;
    deliveryDate?: string | null;
    warehouse?: string | null;
    uomCode?: string | null;
    remarks?: string | null;
    requiredQuantity?: number | null;
    requiredDate?: string | null;
  }>;
};

export type UpdateRfqLineInput = {
  lineNum: number;
  unitPrice: number;
  /** Quoted quantity — seller may revise from buyer request. */
  quantity?: number | null;
  deliveryDate?: string | null;
  discount?: number | null;
};
