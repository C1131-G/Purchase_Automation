export type IcRfqStatus = "DRAFT" | "SUBMITTED" | "COMPLETED" | "CANCELLED";

export type IcRfqLine = {
  rfqLineId: number;
  rfqId: number;
  lineNum: number;
  itemCode: string;
  description: string | null;
  quantity: number;
  unitPrice: number | null;
  discount: number | null;
  taxCode: string | null;
  deliveryDate: string | null;
  warehouse: string | null;
  uomCode: string | null;
  remarks: string | null;
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
