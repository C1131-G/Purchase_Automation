// Payment Input Validation: Schemas for Incoming and Outgoing payments.

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

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

    DocTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
    DocTotal: z.coerce.number().optional(),
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
      .enum(["DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "PaymentMode"])
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
export const BaseCreatePaymentInputSchema = z.object({
  CardCode: z.string().min(1),
  DocDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  Reference: z.string().optional(),
  Remarks: z.string().optional(),
  PaymentMode: z
    .enum(["M-Pesa", "My Cash", "EFTPOS", "Direct Pay", "CASH"])
    .optional()
    .describe("Mode of payment (U_Mode_Pay). If omitted, derived from payment method fields."),
  CashSum: z.number().optional(),
  CashAccount: z.string().optional(),
  TrsfrSum: z.number().optional(),
  TransferSum: z.number().optional(),
  // PaymentChecks: Array of checks.
  PaymentChecks: z
    .array(
      z.object({
        BankCode: z.string(),
        Branch: z.string().optional(),
        CheckAccount: z.string().optional(),
        CheckNumber: z.number(),
        CheckSum: z.number(),
        DueDate: z.string().optional(),
        Endorse: z.string().optional(), // 'tYES' or 'tNO'
      }),
    )
    .optional(),
  // PaymentAccounts: Array of GL Account applications (e.g. for surcharges).
  PaymentAccounts: z
    .array(
      z.object({
        AccountCode: z.string(),
        Decription: z.string().optional(),
        SumPaid: z.number(),
      }),
    )
    .optional(),
  // PaymentInvoices: Array of documents to which this payment is applied.
  PaymentInvoices: z
    .array(
      z.object({
        DocEntry: z.number().int().positive(), // Primary key of the invoice in SAP.
        InvoiceType: z.string().optional(), // 'it_Invoice', 'it_CreditNote', etc.
        SumApplied: z.number().positive(), // Amount of the payment allocated to this invoice.
      }),
    )
    .optional(),
});

export const CreatePaymentInputSchema = BaseCreatePaymentInputSchema.transform((data) => {
  // Normalize TrsfrSum and TransferSum
  if (data.TrsfrSum !== undefined && data.TransferSum === undefined) {
    data.TransferSum = data.TrsfrSum;
  } else if (data.TransferSum !== undefined && data.TrsfrSum === undefined) {
    data.TrsfrSum = data.TransferSum;
  }
  return data;
});

// UpdatePaymentInputSchema: Used for modifying metadata on unconfirmed payments.
export const UpdatePaymentInputSchema = BaseCreatePaymentInputSchema.partial();

export type PaymentQuery = z.infer<typeof PaymentQuerySchema>;
export type PaymentDocNumLookupQuery = z.infer<typeof PaymentDocNumLookupQuerySchema>;
export type CreatePaymentInput = z.infer<typeof CreatePaymentInputSchema>;
export type UpdatePaymentInput = z.infer<typeof UpdatePaymentInputSchema>;
