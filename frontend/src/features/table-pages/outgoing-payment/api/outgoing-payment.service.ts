/** Outgoing Payment Service: Direct API interaction for payment business logic. */
import type { z } from "zod";

import type {
  outgoingPaymentListItemSchema,
  outgoingPaymentListParamsSchema,
  outgoingPaymentListResponseSchema,
} from "@/features/table-pages/outgoing-payment/schemas/outgoing-payment-api.schema";
import { apiClient } from "@/shared/api/client";
import { toQueryString } from "@/shared/api/query-string";

export type OutgoingPaymentListItem = z.infer<typeof outgoingPaymentListItemSchema>;
export type OutgoingPaymentListParams = z.infer<typeof outgoingPaymentListParamsSchema>;

export type OutgoingPaymentListResponse = z.infer<typeof outgoingPaymentListResponseSchema>;
export interface OutgoingPaymentDocNumLookupItem {
  code: string;
  name: string;
}
export interface OutgoingPaymentDocNumLookupResponse {
  success: boolean;
  data: OutgoingPaymentDocNumLookupItem[];
}

export interface CreateOutgoingPaymentPayload {
  CardCode: string;
  DocDate: string;
  Remarks?: string;
  CashSum?: number;
  CashAccount?: string | null;
  TrsfrSum?: number;
  CheckSum?: number;
  PaymentChecks?: {
    BankCode: string;
    Branch: string;
    CheckNumber: number;
    CheckSum: number;
    CheckAccount?: string;
    Endorse?: "tYES" | "tNO";
  }[];
  PaymentInvoices?: {
    DocEntry: number;
    SumApplied: number;
    InvoiceType: "it_PurchaseInvoice" | "it_PurchCredItnote";
  }[];
}

export interface OutgoingPaymentDetail {
  id: number;
  DocEntry: number;
  DocNum: number;
  DocDate: string;
  CardCode: string;
  CardName: string;
  DocTotal: number;
  DocCurr: string;
  Remarks?: string;
  PaymentMode?: string;
  CashSum: number;
  CheckSum: number;
  TrsfrSum: number;
  PaymentChecks: {
    BankCode: string;
    CheckSum: number;
    CheckNumber: number;
    DueDate: string;
    Branch: string;
  }[];
  PaymentCreditCards: {
    CreditSum: number;
    CardName: string;
    CreditCard: number;
    VoucherNum: string;
  }[];
  PaymentInvoices: {
    DocEntry: number;
    DocNum: number;
    SumApplied: number;
    InvoiceType: "it_PurchaseInvoice" | "it_PurchCredItnote";
  }[];
}

export interface OutgoingPaymentDetailResponse {
  success: boolean;
  data: OutgoingPaymentDetail;
}

export interface OutgoingPaymentAccount {
  GLAccount: string;
}

export interface OutgoingPaymentAccountsResponse {
  success: boolean;
  data: OutgoingPaymentAccount[];
  total: number;
}

export const outgoingPaymentAPI = {
  createOutgoingPayment: async (payload: CreateOutgoingPaymentPayload) =>
    apiClient<{
      success: boolean;
      data: { DocNum: number; DocEntry: number };
    }>("/api/v1/outgoing-payments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getOutgoingPayment: async (docNum: string) =>
    apiClient<OutgoingPaymentDetailResponse>(`/api/v1/outgoing-payments/by-doc-num/${docNum}`),
  getOutgoingPaymentDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ limit, search });
    const path = query
      ? `/api/v1/outgoing-payments/docnums?${query}`
      : "/api/v1/outgoing-payments/docnums";
    return apiClient<OutgoingPaymentDocNumLookupResponse>(path);
  },
  getOutgoingPayments: async (params: OutgoingPaymentListParams) => {
    const query = toQueryString(params);
    const path = query ? `/api/v1/outgoing-payments?${query}` : "/api/v1/outgoing-payments";
    return apiClient<OutgoingPaymentListResponse>(path);
  },
  getOutgoingPaymentAccounts: async (search?: string, limit?: number) => {
    const query = toQueryString({ search, limit });
    const path = query
      ? `/api/v1/outgoing-payments/accounts?${query}`
      : "/api/v1/outgoing-payments/accounts";
    return apiClient<OutgoingPaymentAccountsResponse>(path);
  },
};
