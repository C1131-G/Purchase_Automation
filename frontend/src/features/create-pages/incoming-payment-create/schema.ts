import { z } from 'zod'

import { parseISODate } from '@/features/create-pages/create-shared/utils/create-order.utils'

export const paymentInvoiceSchema = z.object({
  DocEntry: z.number(),
  SumApplied: z.number().min(0.01),
  InvoiceType: z.enum(['it_Invoice', 'it_CredItnote']),
})

export const incomingPaymentSchema = z.object({
  CardCode: z.string().min(1, 'Customer is required'),
  DocDate: z.string().refine((val) => parseISODate(val) !== null, 'Invalid Date'),
  Remarks: z.string().optional(),
  CashSum: z.number().min(0).optional(),
  TrsfrSum: z.number().min(0).optional(),
  CheckSum: z.number().min(0).optional(),
  PaymentInvoices: z.array(paymentInvoiceSchema).optional(),
})

export type IncomingPaymentFormValues = z.infer<typeof incomingPaymentSchema>
