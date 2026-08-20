import { z } from "zod";

import {
  currencyAmountSchema,
  sapIsoDateSchema,
  sapPositiveIntegerSchema,
  sapRequiredText,
} from "@/shared/validation/sap-fields.validation";
import { SAP_FIELD_MAX } from "@vendor-portal/validation-contracts";

export const paymentInvoiceSchema = z.object({
  DocEntry: sapPositiveIntegerSchema,
  InvoiceType: z.enum(["it_PurchaseInvoice", "it_PurchCredItnote"]),
  SumApplied: currencyAmountSchema.min(0.01),
});

export const outgoingPaymentSchema = z.object({
  CardCode: sapRequiredText(SAP_FIELD_MAX.cardCode),
  CashSum: currencyAmountSchema.optional(),
  CheckSum: currencyAmountSchema.optional(),
  DocDate: sapIsoDateSchema,
  PaymentInvoices: z.array(paymentInvoiceSchema).optional(),
  Remarks: z.string().max(254).optional(),
  TrsfrSum: currencyAmountSchema.optional(),
});

export type OutgoingPaymentFormValues = z.infer<typeof outgoingPaymentSchema>;
