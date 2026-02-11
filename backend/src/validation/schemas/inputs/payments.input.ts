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
      .openapi({ example: "7008001", description: "Document Number (DocNum)" }),
    // Note: Payments usually use CardName directly for display, CardCode for strict filtering
    CardCode: z
      .string()
      .optional()
      .openapi({ example: "C9999", description: "BP Code (CardCode)" }),
    CardName: z
      .string()
      .optional()
      .openapi({ example: "Tech Solutions Ltd", description: "BP Name (CardName)" }),

    // Date Range Filters
    DocDateStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional()
      .openapi({ example: "2023-01-01", description: "Filter by DocDate Start" }),
    DocDateEnd: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional()
      .openapi({ example: "2023-12-31", description: "Filter by DocDate End" }),

    DocTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
    DocTotal: z.coerce.number().optional(),
    CounterRef: z
      .string()
      .optional()
      .openapi({ example: "COUNTER-001", description: "Customer Counter Reference" }),

    page: z.coerce.number().int().positive().default(1).optional(),
    limit: z.coerce.number().int().positive().max(100).default(10).optional(),
    sortBy: z
      .enum(["DocNum", "DocDate", "CardCode", "CardName", "DocTotal"])
      .optional()
      .openapi({ example: "DocDate", description: "Column to sort by" }),
    sortOrder: z
      .enum(["asc", "desc"])
      .optional()
      .openapi({ example: "desc", description: "Sort direction" }),
  })
  .transform((data) => {
    // Normalize Aliases to Standard Keys
    const normalized = { ...data };

    return normalized;
  });

// CreatePaymentInputSchema: Validates the complex payload for recording a payment.
// It supports cash and transfer sums, along with a list of invoices being settled.
export const CreatePaymentInputSchema = z.object({
  CardCode: z.string().min(1),
  DocDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  Reference: z.string().optional(),
  Remarks: z.string().optional(),
  // PaymentInvoices: Array of documents to which this payment is applied.
  PaymentInvoices: z
    .array(
      z.object({
        DocEntry: z.number().int().positive(), // Primary key of the invoice in SAP.
        SumApplied: z.number().positive(), // Amount of the payment allocated to this invoice.
        InvoiceType: z.string().optional(), // 'it_Invoice', 'it_CreditNote', etc.
      }),
    )
    .optional(),
});

// UpdatePaymentInputSchema: Used for modifying metadata on unconfirmed payments.
export const UpdatePaymentInputSchema = CreatePaymentInputSchema.partial();

export type PaymentQuery = z.infer<typeof PaymentQuerySchema>;
export type CreatePaymentInput = z.infer<typeof CreatePaymentInputSchema>;
export type UpdatePaymentInput = z.infer<typeof UpdatePaymentInputSchema>;
