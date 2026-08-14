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
  Series?: number;
  Remarks?: string;
  CashSum?: number;
  CashAccount?: string | null;
  TrsfrSum?: number;
  TransferDate?: string;
  TransferAccount?: string;
  TransferReference?: string;
  CheckSum?: number;
  PaymentChecks?: {
    BankCode: string;
    Branch: string;
    CheckNumber: number;
    CheckSum: number;
    CheckAccount?: string;
    CountryCode?: string;
    BankName?: string;
    GLAccount?: string;
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
  Series?: number;
  DocDate: string;
  CardCode: string;
  CardName: string;
  DocTotal: number;
  DocCurr: string;
  Remarks?: string;
  PaymentMode?: string;
  CashSum: number;
  CashAccount?: string;
  CheckSum: number;
  TrsfrSum: number;
  TransferDate?: string;
  TransferAccount?: string;
  TransferReference?: string;
  PaymentChecks: {
    BankCode: string;
    CheckSum: number;
    CheckNumber: number;
    DueDate: string;
    Branch: string;
    CountryCode?: string;
    CountryCod?: string;
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
  Account: string;
}

// Wire types (raw response from backend /api/v1/bank-details)
interface BankDetailWire {
  CountryCod: string;
  BankCode: string;
  BankName: string;
}

interface BankDetailsResponseWire {
  success: boolean;
  data: BankDetailWire[];
  total: number;
}

// Normalized model for UI consumers
export interface BankDetail {
  CountryCode: string;
  BankCode: string;
  BankName: string;
}

export interface BankDetailsResponse {
  success: boolean;
  data: BankDetail[];
  total: number;
}

export interface OutgoingPaymentAccountsResponse {
  success: boolean;
  data: OutgoingPaymentAccount[];
  total: number;
}

export interface TransferAccountResponse {
  success: boolean;
  data: { TransferAccount: string } | null;
  message?: string;
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
  getBankDetails: async (search?: string, limit?: number) => {
    const query = toQueryString({ search, limit });
    const path = query ? `/api/v1/bank-details?${query}` : "/api/v1/bank-details";
    const wire = await apiClient<BankDetailsResponseWire>(path);
    return {
      success: wire.success,
      total: wire.total,
      data: wire.data.map((row) => ({
        CountryCode: row.CountryCod,
        BankCode: row.BankCode,
        BankName: row.BankName,
      })),
    };
  },
  resolveTransferAccount: async (date: string) => {
    const query = toQueryString({ date });
    const path = `/api/v1/financial-period/resolve-transfer-account?${query}`;
    return apiClient<TransferAccountResponse>(path);
  },
  updatePayment: async (id: number | string, payload: { Remarks?: string }) =>
    apiClient<{ success: boolean; message: string }>(`/api/v1/outgoing-payments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
