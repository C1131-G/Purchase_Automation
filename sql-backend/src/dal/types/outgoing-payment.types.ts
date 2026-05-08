export interface OutgoingPaymentQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface PaymentDocNumLookupQuery {
  search?: string;
  limit?: number;
}
