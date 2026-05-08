export interface SqlDocument {
  docEntry: number;
  docNum: number;
  docDate: Date;
  cardCode: string;
  cardName: string;
  docTotal: number;
  docStatus: string;
  comments?: string;
}

export type PurchaseOrder = SqlDocument;
export type GRPO = SqlDocument;
export type APInvoice = SqlDocument;
export type APCreditMemo = SqlDocument;
export type SalesOrder = SqlDocument;
export type ARInvoice = SqlDocument;
export type ARCreditMemo = SqlDocument;
export type IncomingPayment = SqlDocument;
export type OutgoingPayment = SqlDocument;
