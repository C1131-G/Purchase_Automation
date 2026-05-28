export interface SapDocument {
  docEntry: number;
  docNum: number;
  docDate: Date;
  cardCode: string;
  cardName: string;
  docTotal: number;
  docStatus: string;
  canceled: string;
}

export type PurchaseOrder = SapDocument;
export type GRPO = SapDocument;
export type APInvoice = SapDocument;
export type APCreditMemo = SapDocument;
export type SalesOrder = SapDocument;
export type ARCreditMemo = SapDocument;

export interface ARInvoice extends SapDocument {
  paidToDate: number;
  numAtCard?: string;
}

export interface IncomingPayment extends SapDocument {
  counterRef?: string;
  cashSum: number;
  transferSum: number;
}

export interface OutgoingPayment {
  docEntry: number;
  docNum: number;
  docDate: Date;
  cardCode: string;
  cardName: string;
  cashSum?: number;
  transferSum?: number;
  canceled: string;
}
