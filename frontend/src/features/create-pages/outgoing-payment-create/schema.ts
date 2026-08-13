import { z } from "zod";

import { parseISODate } from "@/features/create-pages/create-shared/utils/create-order.utils";

export const paymentInvoiceSchema = z.object({
  DocEntry: z.number(),
  InvoiceType: z.enum(["it_PurchaseInvoice", "it_PurchCredItnote"]),
  SumApplied: z.number().min(0.01),
});

export const outgoingPaymentSchema = z.object({
  CardCode: z.string().min(1, "Vendor is required").max(15),
  CashSum: z.number().min(0).optional(),
  CheckSum: z.number().min(0).optional(),
  DocDate: z.string().refine((val) => parseISODate(val) !== null, "Invalid Date"),
  PaymentInvoices: z.array(paymentInvoiceSchema).optional(),
  Remarks: z.string().max(254).optional(),
  TrsfrSum: z.number().min(0).optional(),
});

export type OutgoingPaymentFormValues = z.infer<typeof outgoingPaymentSchema>;
