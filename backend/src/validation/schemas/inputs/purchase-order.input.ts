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
      .openapi({ example: "8001089", description: "Document Number (DocNum)" }),
    CardCode: z
      .string()
      .optional()
      .openapi({ example: "V0019", description: "Vendor Code (CardCode)" }),
    CardName: z
      .string()
      .optional()
      .openapi({ example: "A.S. ASSOCIATES", description: "Vendor Name (CardName)" }),
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

    DocTotalOperator: z
      .enum(["eq", "lt", "gt"])
      .optional()
      .openapi({ example: "eq", description: "DocTotal comparison operator" }),
    DocTotal: z.coerce
      .number()
      .optional()
      .openapi({ example: 1500.25, description: "DocTotal comparison value" }),
    sortBy: z
      .enum(["DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocStatus"])
      .optional()
      .openapi({ example: "DocDate", description: "Sort field" }),
    sortOrder: z
      .enum(["asc", "desc"])
      .optional()
      .openapi({ example: "desc", description: "Sort direction" }),

    page: z.coerce
      .number()
      .int()
      .positive()
      .default(1)
      .openapi({ example: 1, description: "Page number" })
      .optional(),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(100)
      .default(10)
      .openapi({ example: 10, description: "Items per page" })
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
      if (statusUpper === "OPEN") normalized.DocStatus = "O";
      if (statusUpper === "CLOSED") normalized.DocStatus = "C";
    }

    if (normalized.sortOrder) {
      normalized.sortOrder = normalized.sortOrder.toLowerCase() as "asc" | "desc";
    }

    return normalized;
  });

export const PurchaseOrderDocNumLookupQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .openapi({ example: "8001", description: "DocNum contains search term" }),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(10)
    .optional()
    .openapi({ example: 10, description: "Max suggestions (hard capped at 100)" }),
});

// PurchaseOrderLineItemSchema: Validates individual rows in the document.
// Quantities and Prices must be non-negative to ensure data integrity in SAP.
const PurchaseOrderLineItemSchema = z.object({
  ItemCode: z.string().min(1),
  Quantity: z.number().positive(),
  UnitPrice: z.number().nonnegative().optional(), // SAP can auto-fetch if omitted
  UoMCode: z.union([z.string(), z.number()]).optional(),
  UoMEntry: z.coerce.number().int().optional(),
  VatGroup: z.string().optional(),
  WarehouseCode: z.string().optional(),
  DiscountPercent: z.number().min(0).max(100).optional(),
});

// CreatePurchaseOrderInputSchema: Validates the full payload for a new procurement document.
export const CreatePurchaseOrderInputSchema = z.object({
  CardCode: z.string().min(1).openapi({ example: "V1000", description: "Vendor Card Code" }),
  SalesPersonCode: z.coerce
    .number()
    .int()
    .optional()
    .openapi({ example: 7, description: "Assigned buyer/sales employee code" }),
  DocDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional()
    .openapi({ example: "2023-10-27", description: "Document Date (YYYY-MM-DD)" }),
  DocDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional()
    .openapi({ example: "2023-11-27", description: "Document Due Date (YYYY-MM-DD)" }),
  Comments: z
    .string()
    .optional()
    .openapi({ example: "Urgent delivery required", description: "Comments" }),
  Address: z.string().optional().openapi({ description: "Bill To Address" }),
  Address2: z.string().optional().openapi({ description: "Ship To Address" }),
  DocumentLines: z
    .array(PurchaseOrderLineItemSchema)
    .min(1)
    .openapi({ description: "List of items in the purchase order" }),
});

// UpdatePurchaseOrderInputSchema: Edit flow blocks vendor updates (CardCode).
export const UpdatePurchaseOrderInputSchema = z
  .object({
    SalesPersonCode: z.coerce.number().int().optional(),
    DocDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    DocDueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    Comments: z.string().optional(),
    Address: z.string().optional(),
    Address2: z.string().optional(),
    DocumentLines: z.array(PurchaseOrderLineItemSchema).min(1).optional(),
  })
  .strict();

export type PurchaseOrderQuery = z.infer<typeof PurchaseOrderQuerySchema>;
export type PurchaseOrderDocNumLookupQuery = z.infer<typeof PurchaseOrderDocNumLookupQuerySchema>;
export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderInputSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof UpdatePurchaseOrderInputSchema>;
