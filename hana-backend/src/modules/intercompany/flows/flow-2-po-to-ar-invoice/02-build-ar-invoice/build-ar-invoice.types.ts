import type { Flow2ArInvoicePayload } from "../flow-2.types";

/** Open seller SQ line used as BaseLine for AR Invoice Draft convert. */
export type SqBaseLineInput = {
  LineNum: number;
  ItemCode?: string | null;
  Quantity?: number | null;
  LineStatus?: string | null;
  RemainingOpenQuantity?: number | null;
};

export type BuildArInvoiceInput = {
  buyerCustomerCode: string;
  remarksTag: string;
  /**
   * IC_COMPANY.DEFAULT_BRANCH_ID (e.g. 1). Used when line warehouse is missing
   * or not found on seller OWHS. Document BPL may switch to WH.BPLid when WH exists.
   */
  defaultBranchId: number | null;
  /** Seller SAP DB — optional; when set, align BPL from line warehouse without changing WH/UoM. */
  sapDbName?: string | null;
  /** Optional override: resolved branch after warehouse lookup. */
  documentBranchId?: number | null;
  docDate?: unknown;
  docDueDate?: unknown;
  /** Real Customer Ref from buyer PO only — never IC-PO auto tags. */
  numAtCard?: unknown;
  comments?: string;
  /** Buyer PO identity (mapping tags only — not AR remarks / NumAtCard). */
  poDocEntry: number;
  poDocNum?: number | null;
  /**
   * IC remarks chain for AR: PQ (buyer company) + RFQ/SQ (seller company).
   * Prefer IC_COMPANY.COMPANY_NAME values.
   */
  buyerCompanyName?: string | null;
  sellerCompanyName?: string | null;
  /** @deprecated Prefer buyerCompanyName + sellerCompanyName. */
  remarksCardName?: string | null;
  pqDocNum?: number | null;
  pqDocEntry?: number | null;
  rfqNumber?: string | null;
  rfqId?: number | null;
  /** Required — AR draft is always copy-from this seller SQ (BaseType 23). */
  sqDocNum?: number | null;
  sqDocEntry: number;
  /**
   * Seller SQ open lines. Each becomes one AR draft line with BaseType/BaseEntry/BaseLine.
   * Item/tax/UoM/warehouse come from the SQ in SAP — do not rebuild free-standing lines.
   */
  sqLines: SqBaseLineInput[];
};

export type BuildArInvoiceResult = Flow2ArInvoicePayload;
