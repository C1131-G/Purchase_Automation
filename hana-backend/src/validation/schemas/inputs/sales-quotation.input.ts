// Sales Quotation Input Validation: Schemas for customer quotations and list filtering.

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// SalesQuotationQuerySchema: Filters for the customer-facing quotation list.
export const SalesQuotationQuerySchema = z
  .object({
    // Standard SAP B1 Fields
    DocNum: z
      .string()
      .optional()
      .openapi({ description: "Document Number (DocNum)", example: "1001" }),
    CardCode: z
      .string()
      .optional()
      .openapi({ description: "Customer Code (CardCode)", example: "C0019" }),
    CardName: z.string().optional().openapi({
      description: "Customer Name (CardName)",
      example: "Tech Solutions Ltd",
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

    page: z.coerce.number().int().positive().default(1).optional(),
    limit: z.coerce.number().int().positive().max(100).default(10).optional(),
    sortBy: z
      .enum(["DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocStatus"])
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

export const SalesQuotationDocNumLookupQuerySchema = z.object({
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
    .openapi({ description: "DocNum contains search term", example: "1001" }),
});

// SalesQuotationLineItemSchema: Individual items requested in the quotation.
const SalesQuotationLineItemSchema = z.object({
  DiscountPercent: z.number().optional(),
  ItemCode: z.string().min(1),
  Quantity: z.number().positive(),
  UnitPrice: z.number().nonnegative().optional(),
  UoMCode: z.union([z.string(), z.number()]).optional(),
  UoMEntry: z.coerce.number().int().optional(),
  VatGroup: z.string().optional(),
  WarehouseCode: z.string().optional(),
  LineNum: z.number().int().optional(),
});

// CreateSalesQuotationInputSchema: Validates a new sales quotation submission.
export const CreateSalesQuotationInputSchema = z.object({
  Address: z.string().optional(),
  Address2: z.string().optional(),
  CardCode: z.string().min(1), // Customer identification.
  Comments: z.string().optional(),
  DocDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  DocDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  DocumentLines: z.array(SalesQuotationLineItemSchema).min(1),
  NumAtCard: z.string().optional(),
  SalesPersonCode: z.coerce.number().int().optional(),
  Rounding: z.enum(["tYES", "tNO"]).optional(),
  RoundingDiffAmount: z.number().optional(),
});

// UpdateSalesQuotationInputSchema: Edit flow blocks customer updates (CardCode/CardName).
export const UpdateSalesQuotationInputSchema = z
  .object({
    Address: z.string().optional(),
    Address2: z.string().optional(),
    Comments: z.string().optional(),
    DocDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    DocDueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    DocumentLines: z.array(SalesQuotationLineItemSchema).min(1).optional(),
    NumAtCard: z.string().optional(),
    SalesPersonCode: z.coerce.number().int().optional(),
    Rounding: z.enum(["tYES", "tNO"]).optional(),
    RoundingDiffAmount: z.number().optional(),
  })
  .strict();

export type SalesQuotationQuery = z.infer<typeof SalesQuotationQuerySchema>;
export type SalesQuotationDocNumLookupQuery = z.infer<typeof SalesQuotationDocNumLookupQuerySchema>;
export type CreateSalesQuotationInput = z.infer<typeof CreateSalesQuotationInputSchema>;
export type UpdateSalesQuotationInput = z.infer<typeof UpdateSalesQuotationInputSchema>;
