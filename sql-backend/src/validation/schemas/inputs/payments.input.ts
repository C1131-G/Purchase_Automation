import { z } from "zod";

export const PaymentQuerySchema = z.object({
  docNum: z.string().optional(),
  cardCode: z.string().optional(),
  cardName: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  docTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
  docTotal: z.coerce.number().optional(),
  paymentMode: z.string().optional(),
  counterRef: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z
    .enum(["doc_num", "doc_date", "card_code", "card_name", "doc_total", "payment_mode"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const PaymentDocNumLookupQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),
  search: z.string().trim().min(1).max(50).optional(),
});

const PaymentInvoiceLineSchema = z.object({
  docEntry: z.coerce.number().int().positive(),
  invoiceType: z.string().optional(),
  sumApplied: z.coerce.number().positive(),
});

export const CreatePaymentInputSchema = z.object({
  cardCode: z.string().min(1),
  docDate: z.string().optional(),
  reference: z.string().optional(),
  remarks: z.string().optional(),
  paymentMode: z.string().optional(),
  cashSum: z.coerce.number().optional(),
  cashAccount: z.string().nullable().optional(),
  transferSum: z.coerce.number().optional(),
  transferDate: z.string().optional(),
  transferAccount: z.string().optional(),
  transferReference: z.string().optional(),
  invoices: z.array(PaymentInvoiceLineSchema).optional(),
});

export const UpdatePaymentInputSchema = CreatePaymentInputSchema.partial();
