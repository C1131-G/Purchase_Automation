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
  /**
   * Buyer PQ / RFQ purchase tax (VatGroup on source). Same as pqTaxCode.
   * Never copy this onto seller SQ/AR — those resolve seller sales tax.
   */
  taxCode: string | null;
  /** Explicit alias of taxCode — PQ tax code used on buyer draft/PQ. */
  pqTaxCode?: string | null;
  /** Seller SQ sales tax when known (convert/enrich); display/audit only. */
  sqTaxCode?: string | null;
  /** Quoted / ship date (seller-editable). */
  deliveryDate: string | null;
  warehouse: string | null;
  /** Buyer PQ purchase UoM snapshot (IC_RFQ_LINE.UOM_CODE). */
  uomCode: string | null;
  /** SAP OUOM.UomEntry when known (from PQ); preferred when posting SQ. */
  uomEntry?: number | null;
  /**
   * Seller item-master sales UoM (OITM.SalUnitMsr / SUoMEntry, OUOM by name/code).
   * RFQ product row displays this; not persisted.
   */
  sqUomCode?: string | null;
  sqUomEntry?: number | null;
  remarks: string | null;
  /** Buyer required qty snapshot (display / locked). Enriched from buyer PQ when missing. */
  requiredQuantity?: number | null;
  /** Buyer required date snapshot (display / locked). */
  requiredDate?: string | null;
};

export type IcRfqHeader = {
  rfqId: number;
  rfqNumber: string;
  sourceCompanyId: number;
  targetCompanyId: number;
  /** From IC_COMPANY join — display name for source (buyer) company. */
  sourceCompanyName?: string | null;
  /** From IC_COMPANY join — display name for target (seller) company. */
  targetCompanyName?: string | null;
  pqDraftDocEntry: number;
  pqDraftDocNum: number | null;
  vendorCode: string;
  status: IcRfqStatus | string;
  remarks: string | null;
  createdBy: string | null;
  lines?: IcRfqLine[];
  /**
   * Buyer-side vendor code (IC routing / BP lookup key). Not shown on sales RFQ UI.
   * Seller UI shows customerCode/customerName instead (buyer as customer on seller books).
   */
  vendorName?: string | null;
  /**
   * Seller-side customer (buyer BP on seller company) — sales RFQ / SQ display.
   * From IC_BP_MAPPING.BUYER_CUSTOMER_CODE + OCRD / source company name.
   */
  customerCode?: string | null;
  customerName?: string | null;
  /** Buyer sales employee (SlpName) from source PQ — logistics "Buyer" field. */
  buyerName?: string | null;
  buyerCode?: string | null;
  docDate?: string | null;
  docDueDate?: string | null;
  requiredDate?: string | null;
  billToAddress?: string | null;
  shipToAddress?: string | null;
  warehouseCode?: string | null;
  vendorRefNo?: string | null;
  /** True when buyer PQ has a SUCCESS PQ→PO map — RFQ commercials are then locked. */
  pqCopiedToPo?: boolean;
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
    uomEntry?: number | null;
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
  /**
   * Buyer PQ VatGroup snapshot. Seller fill must omit this.
   * COALESCE on UPDATE — null leaves IC_RFQ_LINE.TAX_CODE unchanged.
   */
  taxCode?: string | null;
};

/** Header extras on seller fill — warehouse is seller-only (never PATCHed to buyer PQ). */
export type UpdateRfqExtras = {
  warehouse?: string | null;
};
