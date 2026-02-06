// Invoice Input Validation: Schemas for AP/AR invoices and list filtering.

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// InvoiceQuerySchema: Filters for the invoice history list.
export const InvoiceQuerySchema = z
  .object({
    // Standard SAP B1 Fields
    DocNum: z
      .string()
      .optional()
      .openapi({ example: "2001034", description: "Document Number (DocNum)" }),
    CardCode: z
      .string()
      .optional()
      .openapi({ example: "V1002", description: "BP Code (CardCode)" }),
    CardName: z
      .string()
      .optional()
      .openapi({ example: "Micro Chips Inc.", description: "BP Name (CardName)" }),
    DocStatus: z
      .string()
      .optional()
      .openapi({ example: "Open", description: "Document Status (O=Open, C=Closed)" }),

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

    Canceled: z.string().optional().openapi({ example: "N", description: "Canceled status (Y/N)" }),

    page: z.coerce.number().int().positive().default(1).optional(),
    limit: z.coerce.number().int().positive().max(100).default(10).optional(),
  })
  .transform((data) => {
    // Normalize Aliases to Standard Keys
    const normalized = { ...data };

    // Smart Status Mapping: Convert "Open"/"Closed" to "O"/"C" (Case-Insensitive)
    if (normalized.DocStatus) {
      const statusUpper = normalized.DocStatus.toUpperCase();
      if (statusUpper === "OPEN") normalized.DocStatus = "O";
      if (statusUpper === "CLOSED") normalized.DocStatus = "C";
    }

    // Smart Canceled Mapping: Convert "Yes"/"No" to "Y"/"N" (Case-Insensitive)
    if (normalized.Canceled) {
      const canceledUpper = normalized.Canceled.toUpperCase();
      if (canceledUpper === "YES") normalized.Canceled = "Y";
      if (canceledUpper === "NO") normalized.Canceled = "N";
    }

    return normalized;
  });

// InvoiceLineItemSchema: Rows in the invoice document.
const InvoiceLineItemSchema = z.object({
  ItemCode: z.string().min(1),
  Quantity: z.number().positive(),
  UnitPrice: z.number().nonnegative(),
  Price: z.number().nonnegative().optional(), // SAP 'Price' field vs 'UnitPrice'.
  TaxCode: z.string().optional(),
  WarehouseCode: z.string().optional(),
});

// CreateInvoiceInputSchema: Validates new invoice submissions.
export const CreateInvoiceInputSchema = z.object({
  CardCode: z.string().min(1),
  DocDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  DocDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  Comments: z.string().optional(),
  NumAtCard: z.string().optional(), // Customer/Vendor reference number (BP Ref No).
  DocumentLines: z.array(InvoiceLineItemSchema).min(1),
});

// UpdateInvoiceInputSchema: Allows modification of pending invoices.
export const UpdateInvoiceInputSchema = CreateInvoiceInputSchema.partial().extend({
  Address: z.string().optional(),
});

export type InvoiceQuery = z.infer<typeof InvoiceQuerySchema>;
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInputSchema>;
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceInputSchema>;
