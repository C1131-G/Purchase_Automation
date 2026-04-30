/** Incoming Payment Service: Direct API interaction for payment business logic. */
import { z } from 'zod'

import {
  incomingPaymentListItemSchema,
  incomingPaymentListParamsSchema,
  incomingPaymentListResponseSchema,
} from '@/features/table-pages/incoming-payment/schemas/incoming-payment-api.schema'
import { apiClient } from '@/shared/api/client'
import { toQueryString } from '@/shared/api/query-string'

export type IncomingPaymentListItem = z.infer<typeof incomingPaymentListItemSchema>
export type IncomingPaymentListParams = z.infer<typeof incomingPaymentListParamsSchema>

export type IncomingPaymentListResponse = z.infer<typeof incomingPaymentListResponseSchema>
export type IncomingPaymentDocNumLookupItem = { code: string; name: string }
export type IncomingPaymentDocNumLookupResponse = {
  success: boolean
  data: IncomingPaymentDocNumLookupItem[]
}

export type CreateIncomingPaymentPayload = {
  CardCode: string
  DocDate: string
  Remarks: string
  CashSum: number
  TrsfrSum: number
  CheckSum: number
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
  PaymentInvoices: {
    DocEntry: number
    SumApplied: number
    InvoiceType: 'it_Invoice' | 'it_CredItnote'
  }[]
}

export type IncomingPaymentDetail = {
  id: number
  DocEntry: number
  DocNum: number
  DocDate: string
  CardCode: string
  CardName: string
  DocTotal: number
  DocCurr: string
  Remarks: string
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
    InvoiceType: 'it_Invoice' | 'it_CredItnote'
  }[]
}

export type IncomingPaymentDetailResponse = {
  success: boolean
  data: IncomingPaymentDetail
}

export const incomingPaymentAPI = {
  getIncomingPayments: async (params: IncomingPaymentListParams) => {
    const query = toQueryString(params)
    const path = query ? `/api/v1/incoming-payments?${query}` : '/api/v1/incoming-payments'
    return apiClient<IncomingPaymentListResponse>(path)
  },
  getIncomingPaymentDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ search, limit })
    const path = query
      ? `/api/v1/incoming-payments/docnums?${query}`
      : '/api/v1/incoming-payments/docnums'
    return apiClient<IncomingPaymentDocNumLookupResponse>(path)
  },
  getIncomingPayment: async (docNum: string) => {
    return apiClient<IncomingPaymentDetailResponse>(
      `/api/v1/incoming-payments/by-doc-num/${docNum}`,
    )
  },
  createIncomingPayment: async (payload: CreateIncomingPaymentPayload) => {
    return apiClient<{ success: boolean; data: { DocNum: number; DocEntry: number } }>(
      '/api/v1/incoming-payments',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    )
  },
}
