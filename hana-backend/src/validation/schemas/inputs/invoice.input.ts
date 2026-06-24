// Invoice Input Validation: Schemas for AP/AR invoices and list filtering.

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { AttachmentInputSchema } from "./purchase-quotation.input";

extendZodWithOpenApi(z);

// InvoiceQuerySchema: Filters for the invoice history list.
export const InvoiceQuerySchema = z
  .object({
    // Standard SAP B1 Fields
    DocNum: z
      .string()
      .optional()
      .openapi({ description: "Document Number (DocNum)", example: "2001034" }),
    CardCode: z
      .string()
      .optional()
      .openapi({ description: "BP Code (CardCode)", example: "V1002" }),
    CardName: z.string().optional().openapi({
      description: "BP Name (CardName)",
      example: "Micro Chips Inc.",
    }),
    DocStatus: z.string().optional().openapi({
      description: "Document Status (O=Open, C=Closed)",
      example: "Open",
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
    NumAtCard: z.string().optional().openapi({
      description: "Customer/Vendor Reference (NumAtCard)",
      example: "122",
    }),

    page: z.coerce.number().int().positive().default(1).optional(),
    limit: z.coerce.number().int().positive().max(100).default(10).optional(),
    sortBy: z
      .enum(["DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "NumAtCard", "DocStatus"])
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

    // Smart Status Mapping: Convert "Open"/"Closed" to "O"/"C" (Case-Insensitive)
    if (normalized.DocStatus) {
      const statusUpper = normalized.DocStatus.toUpperCase();
      if (statusUpper === "OPEN") {
        normalized.DocStatus = "O";
      }
      if (statusUpper === "CLOSED") {
        normalized.DocStatus = "C";
      }
    }

    return normalized;
  });

export const InvoiceDocNumLookupQuerySchema = z.object({
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
    .openapi({ description: "DocNum contains search term", example: "2001" }),
});

// InvoiceLineItemSchema: Rows in the invoice document.
const InvoiceLineItemSchema = z.object({
  BaseEntry: z.number().int().optional(),
  BaseLine: z.number().int().optional(),
  BaseType: z.number().int().optional(),
  DiscountPercent: z.number().optional(),
  ItemCode: z.string().min(1),
  Price: z.number().nonnegative().optional(), // SAP 'Price' field vs 'UnitPrice'.
  Quantity: z.number().positive(),
  UnitPrice: z.number().nonnegative().optional(),
  UoMCode: z.union([z.string(), z.number()]).optional(),
  UoMEntry: z.coerce.number().int().optional(),
  VatGroup: z.string().optional(),
  WarehouseCode: z.string().optional(),
  LineNum: z.number().int().optional(),
});

// CreateInvoiceInputSchema: Validates new invoice submissions.
export const CreateInvoiceInputSchema = z.object({
  Address: z.string().optional().openapi({ description: "Bill To Address" }),
  Address2: z.string().optional().openapi({ description: "Ship To Address" }),
  CardCode: z.string().min(1),
  Comments: z.string().optional(),
  DocDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  DocDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  DocumentLines: z.array(InvoiceLineItemSchema).min(1),
  NumAtCard: z.string().optional(), // Customer/Vendor reference number (BP Ref No).
  SalesPersonCode: z.coerce.number().int().optional(),
  Rounding: z.enum(["tYES", "tNO"]).optional(),
  RoundingDiffAmount: z.number().optional(), // Sales Employee code (OINV.SlpCode).
  attachments: z.array(AttachmentInputSchema).optional(),
});

// UpdateInvoiceInputSchema: Edit flow accepts only delivery date and remarks/comments updates.
export const UpdateInvoiceInputSchema = z
  .object({
    Comments: z.string().optional(),
    DocDueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    NumAtCard: z.string().optional(),
    SalesPersonCode: z.coerce.number().int().optional(),
    attachments: z.array(AttachmentInputSchema).optional(),
  })
  .strict();

export type InvoiceQuery = z.infer<typeof InvoiceQuerySchema>;
export type InvoiceDocNumLookupQuery = z.infer<typeof InvoiceDocNumLookupQuerySchema>;
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInputSchema>;
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceInputSchema>;
