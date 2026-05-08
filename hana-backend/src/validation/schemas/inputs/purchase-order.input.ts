// Purchase Order Input Validation: Schemas for filtering lists and validating creation/update payloads.

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// PurchaseOrderQuerySchema: Filters for the PO list view.
export const PurchaseOrderQuerySchema = z
  .object({
    // Standard SAP B1 Fields
    DocNum: z
      .string()
      .optional()
      .openapi({ description: "Document Number (DocNum)", example: "8001089" }),
    CardCode: z
      .string()
      .optional()
      .openapi({ description: "Vendor Code (CardCode)", example: "V0019" }),
    CardName: z.string().optional().openapi({
      description: "Vendor Name (CardName)",
      example: "A.S. ASSOCIATES",
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

    DocTotalOperator: z
      .enum(["eq", "lt", "gt"])
      .optional()
      .openapi({ description: "DocTotal comparison operator", example: "eq" }),
    DocTotal: z.coerce
      .number()
      .optional()
      .openapi({ description: "DocTotal comparison value", example: 1500.25 }),
    sortBy: z
      .enum(["DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocStatus"])
      .optional()
      .openapi({ description: "Sort field", example: "DocDate" }),
    sortOrder: z
      .enum(["asc", "desc"])
      .optional()
      .openapi({ description: "Sort direction", example: "desc" }),

    page: z.coerce
      .number()
      .int()
      .positive()
      .default(1)
      .openapi({ description: "Page number", example: 1 })
      .optional(),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(100)
      .default(10)
      .openapi({ description: "Items per page", example: 10 })
      .optional(),
  })
  .refine(
    (data) =>
      (data.DocTotalOperator === undefined && data.DocTotal === undefined) ||
      (data.DocTotalOperator !== undefined && data.DocTotal !== undefined),
    {
      message: "DocTotal and DocTotalOperator must be provided together",
      path: ["DocTotal"],
    },
  )
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

    if (normalized.sortOrder) {
      normalized.sortOrder = normalized.sortOrder.toLowerCase() as "asc" | "desc";
    }

    return normalized;
  });

export const PurchaseOrderDocNumLookupQuerySchema = z.object({
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
    .openapi({ description: "DocNum contains search term", example: "8001" }),
});

// PurchaseOrderLineItemSchema: Validates individual rows in the document.
// Quantities and Prices must be non-negative to ensure data integrity in SAP.
const PurchaseOrderLineItemSchema = z.object({
  DiscountPercent: z.number().min(0).max(100).optional(),
  ItemCode: z.string().min(1),
  Quantity: z.number().positive(),
  UnitPrice: z.number().nonnegative().optional(), // SAP can auto-fetch if omitted
  UoMCode: z.union([z.string(), z.number()]).optional(),
  UoMEntry: z.coerce.number().int().optional(),
  VatGroup: z.string().optional(),
  WarehouseCode: z.string().optional(),
});

// CreatePurchaseOrderInputSchema: Validates the full payload for a new procurement document.
export const CreatePurchaseOrderInputSchema = z.object({
  Address: z.string().optional().openapi({ description: "Bill To Address" }),
  Address2: z.string().optional().openapi({ description: "Ship To Address" }),
  CardCode: z.string().min(1).openapi({ description: "Vendor Card Code", example: "V1000" }),
  Comments: z
    .string()
    .optional()
    .openapi({ description: "Comments", example: "Urgent delivery required" }),
  DocDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional()
    .openapi({
      description: "Document Date (YYYY-MM-DD)",
      example: "2023-10-27",
    }),
  DocDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional()
    .openapi({
      description: "Document Due Date (YYYY-MM-DD)",
      example: "2023-11-27",
    }),
  DocumentLines: z
    .array(PurchaseOrderLineItemSchema)
    .min(1)
    .openapi({ description: "List of items in the purchase order" }),
  SalesPersonCode: z.coerce
    .number()
    .int()
    .optional()
    .openapi({ description: "Assigned buyer/sales employee code", example: 7 }),
});

// UpdatePurchaseOrderInputSchema: Edit flow blocks vendor updates (CardCode).
export const UpdatePurchaseOrderInputSchema = z
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
    DocumentLines: z.array(PurchaseOrderLineItemSchema).min(1).optional(),
    SalesPersonCode: z.coerce.number().int().optional(),
  })
  .strict();

export type PurchaseOrderQuery = z.infer<typeof PurchaseOrderQuerySchema>;
export type PurchaseOrderDocNumLookupQuery = z.infer<typeof PurchaseOrderDocNumLookupQuerySchema>;
export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderInputSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof UpdatePurchaseOrderInputSchema>;
