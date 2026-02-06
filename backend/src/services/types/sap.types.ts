/**
 * Shared SAP Service Layer Types
 */

export interface SAPDocumentLine {
  ItemCode: string;
  ItemDescription?: string;
  Quantity: number;
  Price?: number;
  UnitPrice?: number;
  TaxCode?: string;
  WarehouseCode?: string;
  LineTotal?: number;
}

export interface SAPAttachmentResult {
  AbsoluteEntry: number;
}

export interface SAPDocumentResponse {
  DocEntry: number;
  DocNum: number;
  CardCode: string;
  CardName: string;
  DocDate: string;
  DocTotal: number;
  DocumentStatus: string;
  Cancelled: string;
  Comments?: string;
  DocumentLines: SAPDocumentLine[];
  AttachmentEntry?: number;
  [key: string]: unknown; // For other dynamic fields
}

/**
 * Base List Item for Marketing Documents
 */
export interface SAPMarketingDocumentBase {
  id: number;
  DocEntry: number;
  DocNum: number;
  DocDate: string | Date;
  CardCode: string;
  CardName: string;
  DocTotal: number;
  DocStatus: string;
  Canceled: string;
}

/**
 * Base Detail for Marketing Documents
 */
export interface SAPMarketingDocumentDetail extends SAPMarketingDocumentBase {
  Address?: string;
  Comments?: string;
  DocumentLines: Array<{
    ItemCode: string;
    ItemDescription?: string;
    Quantity: number;
    Price?: number;
    TaxCode?: string;
    WarehouseCode?: string;
    LineTotal?: number;
  }>;
}

/**
 * Base List Item for Payments
 */
export interface SAPPaymentBase {
  id: number;
  DocEntry: number;
  DocNum: number;
  DocDate: string | Date;
  CardCode: string;
  CardName: string;
  Canceled: string;
  DocTotal?: number;
}

/**
 * Base Detail for Payments
 */
export interface SAPPaymentDetail extends SAPPaymentBase {
  Comments?: string;
  PaymentInvoices: Array<{
    DocEntry: number;
    SumApplied: number;
    InvoiceType: string;
  }>;
}
