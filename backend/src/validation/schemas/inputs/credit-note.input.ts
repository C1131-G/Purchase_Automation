// Credit Note Input Validation: Schemas for reversals and returns (AP/AR).

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// CreditNoteQuerySchema: Filters for the credit history list.
export const CreditNoteQuerySchema = z
  .object({
    // Standard SAP B1 Fields
    DocNum: z
      .string()
      .optional()
      .openapi({ example: "5003001", description: "Document Number (DocNum)" }),
    CardCode: z
      .string()
      .optional()
      .openapi({ example: "V1099", description: "BP Code (CardCode)" }),
    CardName: z
      .string()
      .optional()
      .openapi({ example: "Tech Solutions Ltd", description: "BP Name (CardName)" }),
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

// CreditNoteLineItemSchema: Individual items being credited or returned.
const CreditNoteLineItemSchema = z.object({
  ItemCode: z.string().min(1),
  Quantity: z.number().positive(),
  UnitPrice: z.number().nonnegative(),
  TaxCode: z.string().optional(),
  WarehouseCode: z.string().optional(),
});

// CreateCreditNoteInputSchema: Validates new credit note creation.
export const CreateCreditNoteInputSchema = z.object({
  CardCode: z.string().min(1),
  DocDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  Comments: z.string().optional(),
  DocumentLines: z.array(CreditNoteLineItemSchema).min(1),
});

// UpdateCreditNoteInputSchema: Allows modification of credit note drafts.
export const UpdateCreditNoteInputSchema = CreateCreditNoteInputSchema.partial().extend({
  Address: z.string().optional(),
});

export type CreditNoteQuery = z.infer<typeof CreditNoteQuerySchema>;
export type CreateCreditNoteInput = z.infer<typeof CreateCreditNoteInputSchema>;
export type UpdateCreditNoteInput = z.infer<typeof UpdateCreditNoteInputSchema>;
