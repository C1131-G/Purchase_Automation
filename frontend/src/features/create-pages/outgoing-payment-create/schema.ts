import { z } from 'zod'

import { parseISODate } from '@/features/create-pages/create-shared/utils/create-order.utils'

export const paymentInvoiceSchema = z.object({
  DocEntry: z.number(),
  SumApplied: z.number().min(0.01),
  InvoiceType: z.enum(['it_PurchaseInvoice', 'it_PurchCredItnote']),
})

export const outgoingPaymentSchema = z.object({
  CardCode: z.string().min(1, 'Vendor is required'),
  DocDate: z.string().refine((val) => parseISODate(val) !== null, 'Invalid Date'),
  Remarks: z.string().optional(),
  CashSum: z.number().min(0).optional(),
  TrsfrSum: z.number().min(0).optional(),
  CheckSum: z.number().min(0).optional(),
  PaymentInvoices: z.array(paymentInvoiceSchema).optional(),
})

export type OutgoingPaymentFormValues = z.infer<typeof outgoingPaymentSchema>
