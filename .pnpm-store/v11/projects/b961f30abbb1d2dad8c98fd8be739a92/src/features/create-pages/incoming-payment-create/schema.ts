import { z } from "zod";

import { parseISODate } from "@/features/create-pages/create-shared/utils/create-order.utils";

export const paymentInvoiceSchema = z.object({
  DocEntry: z.number(),
  InvoiceType: z.enum(["it_Invoice", "it_CredItnote"]),
  SumApplied: z.number().min(0.01),
});

export const incomingPaymentSchema = z.object({
  CardCode: z.string().min(1, "Customer is required"),
  CashSum: z.number().min(0).optional(),
  CheckSum: z.number().min(0).optional(),
  DocDate: z.string().refine((val) => parseISODate(val) !== null, "Invalid Date"),
  PaymentInvoices: z.array(paymentInvoiceSchema).optional(),
  Remarks: z.string().optional(),
  TrsfrSum: z.number().min(0).optional(),
});

export type IncomingPaymentFormValues = z.infer<typeof incomingPaymentSchema>;
