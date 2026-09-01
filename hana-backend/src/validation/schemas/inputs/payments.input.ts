// Payment Input Validation: Schemas for Incoming and Outgoing payments.

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  SAP_FIELD_MAX,
  sapDocumentSeriesFields,
  sapOptionalText,
  sapRequiredText,
} from "@/validation/schemas/inputs/sap-document-fields";
import {
  sapNonnegativeAmountSchema,
  sapPositiveIntegerSchema,
  sapPositiveQuantitySchema,
  strictDecimalQuerySchema,
} from "@/validation/schemas/inputs/sap-numeric-fields";

extendZodWithOpenApi(z);

// PaymentQuerySchema: Filters for searching through payment history.
export const PaymentQuerySchema = z
  .object({
    // Standard SAP B1 Fields
    DocNum: z
      .string()
      .optional()
      .openapi({ description: "Document Number (DocNum)", example: "7008001" }),
    // Note: Payments usually use CardName directly for display, CardCode for strict filtering
    CardCode: z
      .string()
      .optional()
      .openapi({ description: "BP Code (CardCode)", example: "C9999" }),
    CardName: z.string().optional().openapi({
      description: "BP Name (CardName)",
      example: "Tech Solutions Ltd",
    }),

    // Date Range Filters
    DocDateStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional()
      .openapi({
        description: "Filter by DocDate Start",
        example: "2023-01-01",
      }),
    DocDateEnd: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional()
      .openapi({ description: "Filter by DocDate End", example: "2023-12-31" }),
    DueDateStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    DueDateEnd: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),

    DocTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
    DocTotal: strictDecimalQuerySchema.optional(),
    PaymentMode: z
      .enum(["M-Pesa", "My Cash", "EFTPOS", "Direct Pay", "CASH"])
      .optional()
      .openapi({ description: "Payment Mode", example: "CASH" }),
    CounterRef: z.string().optional().openapi({
      description: "Customer Counter Reference",
      example: "COUNTER-001",
    }),

    page: z.coerce.number().int().positive().default(1).optional(),
    limit: z.coerce.number().int().positive().max(100).default(10).optional(),
    sortBy: z
      .enum(["DocNum", "DocDate", "DueDate", "CardCode", "CardName", "DocTotal", "PaymentMode"])
      .optional()
      .openapi({ description: "Column to sort by", example: "DocDate" }),
    sortOrder: z
      .enum(["asc", "desc"])
      .optional()
      .openapi({ description: "Sort direction", example: "desc" }),
  })
  .transform((data) => {
    // Normalize Aliases to Standard Keys
    const normalized = { ...data };

    return normalized;
  });

export const PaymentDocNumLookupQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10).optional().openapi({
    description: "Max suggestions (hard capped at 100)",
    example: 10,
  }),
  search: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .openapi({ description: "DocNum contains search term", example: "7008" }),
});

// CreatePaymentInputSchema: Validates the complex payload for recording a payment.
// It supports cash and transfer sums, along with a list of invoices being settled.
export const BaseCreatePaymentInputSchema = z
  .object({
    CardCode: sapRequiredText(SAP_FIELD_MAX.cardCode),
    ...sapDocumentSeriesFields,
    DocDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    Reference: sapOptionalText(SAP_FIELD_MAX.numAtCard),
    Remarks: sapOptionalText(SAP_FIELD_MAX.comments),
    PaymentMode: z
      .enum(["M-Pesa", "My Cash", "EFTPOS", "Direct Pay", "CASH"])
      .optional()
      .describe("Mode of payment (U_Mode_Pay). If omitted, derived from payment method fields."),
    CashSum: sapNonnegativeAmountSchema.optional(),
    CashAccount: z.string().nullable().optional(),
    TrsfrSum: sapNonnegativeAmountSchema.optional(),
    TransferSum: sapNonnegativeAmountSchema.optional(),
    TransferDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    TransferAccount: sapOptionalText(SAP_FIELD_MAX.glAccount),
    TransferReference: sapOptionalText(SAP_FIELD_MAX.transferReference),
    SurchargeTotal: sapNonnegativeAmountSchema.optional(),
    // PaymentChecks: Array of checks.
    PaymentChecks: z
      .array(
        z.object({
          BankCode: z.string().max(SAP_FIELD_MAX.bankCode),
          Branch: sapOptionalText(SAP_FIELD_MAX.bankBranch),
          CheckNumber: sapPositiveIntegerSchema,
          CheckSum: sapNonnegativeAmountSchema,
          DueDate: z.string().optional(),
          Endorse: z.string().optional(),
          OriginallyIssuedBy: sapOptionalText(SAP_FIELD_MAX.issuedBy),
          CountryCode: sapOptionalText(SAP_FIELD_MAX.countryCode),
          BankName: z.string().optional(),
          GLAccount: sapOptionalText(SAP_FIELD_MAX.glAccount),
        }),
      )
      .optional(),
    // PaymentCreditCards: Array of credit card details.
    PaymentCreditCards: z
      .array(
        z.object({
          CreditCard: sapPositiveIntegerSchema,
          CreditSum: sapNonnegativeAmountSchema,
          VoucherNum: z.string(),
          CreditCardNumber: z.string().optional(),
          CardValidUntil: z.string().optional(),
        }),
      )
      .optional(),
    // PaymentAccounts: Array of GL Account applications (e.g. for surcharges).
    PaymentAccounts: z
      .array(
        z.object({
          AccountCode: z.string(),
          Decription: z.string().optional(),
          SumPaid: sapNonnegativeAmountSchema,
        }),
      )
      .optional(),
    // PaymentInvoices: Array of documents to which this payment is applied.
    PaymentInvoices: z
      .array(
        z.object({
          DocEntry: sapPositiveIntegerSchema, // Primary key of the invoice in SAP.
          InvoiceType: z.string().optional(), // 'it_Invoice', 'it_CreditNote', etc.
          SumApplied: sapPositiveQuantitySchema, // Amount of the payment allocated to this invoice.
        }),
      )
      .optional(),
  })
  .strict();

export const CreatePaymentInputSchema = BaseCreatePaymentInputSchema.transform((data) => {
  // Normalize TrsfrSum and TransferSum
  if (data.TrsfrSum !== undefined && data.TransferSum === undefined) {
    data.TransferSum = data.TrsfrSum;
  } else if (data.TransferSum !== undefined && data.TrsfrSum === undefined) {
    data.TrsfrSum = data.TransferSum;
  }
  // Normalize CashAccount null to undefined for cheque-only submissions
  if (data.CashAccount === null) {
    data.CashAccount = undefined;
  }
  if (data.TransferReference !== undefined) {
    data.TransferReference = data.TransferReference.trim();
  }
  return data;
});

// UpdatePaymentInputSchema: Used for modifying metadata on unconfirmed payments.
export const UpdatePaymentInputSchema = BaseCreatePaymentInputSchema.partial();

export type PaymentQuery = z.infer<typeof PaymentQuerySchema>;
export type PaymentDocNumLookupQuery = z.infer<typeof PaymentDocNumLookupQuerySchema>;
export type CreatePaymentInput = z.infer<typeof CreatePaymentInputSchema>;
export type UpdatePaymentInput = z.infer<typeof UpdatePaymentInputSchema>;
