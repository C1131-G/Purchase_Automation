/** Outgoing Payment Service: Direct API interaction for payment business logic. */
import { z } from 'zod'

import {
  outgoingPaymentListItemSchema,
  outgoingPaymentListParamsSchema,
  outgoingPaymentListResponseSchema,
} from '@/features/table-pages/outgoing-payment/schemas/outgoing-payment-api.schema'
import { apiClient } from '@/shared/api/client'
import { toQueryString } from '@/shared/api/query-string'

export type OutgoingPaymentListItem = z.infer<typeof outgoingPaymentListItemSchema>
export type OutgoingPaymentListParams = z.infer<typeof outgoingPaymentListParamsSchema>

export type OutgoingPaymentListResponse = z.infer<typeof outgoingPaymentListResponseSchema>
export type OutgoingPaymentDocNumLookupItem = { code: string; name: string }
export type OutgoingPaymentDocNumLookupResponse = {
  success: boolean
  data: OutgoingPaymentDocNumLookupItem[]
}

export type CreateOutgoingPaymentPayload = {
  CardCode: string
  DocDate: string
  Remarks?: string
  CashSum?: number
  TrsfrSum?: number
  CheckSum?: number
  PaymentCreditCards?: {
    CreditCard: number
    CreditSum: number
    VoucherNum: string
  }[]
  PaymentChecks?: {
    BankCode: string
    Branch: string
    CheckNumber: number
    CheckSum: number
    CheckAccount?: string
    Endorse?: 'tYES' | 'tNO'
  }[]
  SurchargeTotal?: number
  PaymentInvoices?: {
    DocEntry: number
    SumApplied: number
    InvoiceType: 'it_PurchaseInvoice' | 'it_PurchCredItnote'
  }[]
}

export type OutgoingPaymentDetail = {
  id: number
  DocEntry: number
  DocNum: number
  DocDate: string
  CardCode: string
  CardName: string
  DocTotal: number
  DocCurr: string
  Remarks?: string
  PaymentMode?: string
  CashSum: number
  CheckSum: number
  TrsfrSum: number
  PaymentChecks: {
    BankCode: string
    CheckSum: number
    CheckNumber: number
    DueDate: string
    Branch: string
  }[]
  PaymentCreditCards: {
    CreditSum: number
    CardName: string
    CreditCard: number
    VoucherNum: string
  }[]
  PaymentInvoices: {
    DocEntry: number
    DocNum: number
    SumApplied: number
    InvoiceType: 'it_PurchaseInvoice' | 'it_PurchCredItnote'
  }[]
}

export type OutgoingPaymentDetailResponse = {
  success: boolean
  data: OutgoingPaymentDetail
}

export const outgoingPaymentAPI = {
  getOutgoingPayments: async (params: OutgoingPaymentListParams) => {
    const query = toQueryString(params)
    const path = query ? `/api/v1/outgoing-payments?${query}` : '/api/v1/outgoing-payments'
    return apiClient<OutgoingPaymentListResponse>(path)
  },
  getOutgoingPaymentDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ search, limit })
    const path = query
      ? `/api/v1/outgoing-payments/docnums?${query}`
      : '/api/v1/outgoing-payments/docnums'
    return apiClient<OutgoingPaymentDocNumLookupResponse>(path)
  },
  getOutgoingPayment: async (docNum: string) => {
    return apiClient<OutgoingPaymentDetailResponse>(
      `/api/v1/outgoing-payments/by-doc-num/${docNum}`,
    )
  },
  createOutgoingPayment: async (payload: CreateOutgoingPaymentPayload) => {
    return apiClient<{ success: boolean; data: { DocNum: number; DocEntry: number } }>(
      '/api/v1/outgoing-payments',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    )
  },
}
