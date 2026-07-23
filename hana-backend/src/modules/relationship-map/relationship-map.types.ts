export interface NodeResult {
  docEntry: number;
  docNum: number;
}

export interface RelationshipMapResult {
  salesQuotation: NodeResult[];
  salesOrder: NodeResult[];
  arInvoice: NodeResult[];
  arCreditMemo: NodeResult[];
  incomingPayment: NodeResult[];
  purchaseQuotation?: NodeResult[];
  purchaseOrder?: NodeResult[];
  grpo?: NodeResult[];
  apInvoice?: NodeResult[];
  apCreditMemo?: NodeResult[];
  outgoingPayment?: NodeResult[];
  delivery?: NodeResult[];
}
