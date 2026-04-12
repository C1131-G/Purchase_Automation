// GRPO Input Validation: Schemas for Goods Receipt PO filtering and submission.

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// GRPOQuerySchema: Filters for the shipment delivery list view.
export const GRPOQuerySchema = z
  .object({
    // Standard SAP B1 Fields
    DocNum: z
      .string()
      .optional()
      .openapi({ example: "6005001", description: "Document Number (DocNum)" }),
    CardCode: z
      .string()
      .optional()
      .openapi({ example: "V1005", description: "Vendor Code (CardCode)" }),
    CardName: z
      .string()
      .optional()
      .openapi({ example: "Acme Corp", description: "Vendor Name (CardName)" }),
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
      .openapi({ example: 1736.5, description: "DocTotal comparison value" }),
    sortBy: z
      .enum(["DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocStatus"])
      .optional()
      .openapi({ example: "DocDate", description: "Sort field" }),
    sortOrder: z
      .enum(["asc", "desc"])
      .optional()
      .openapi({ example: "desc", description: "Sort direction" }),

    page: z.coerce.number().int().positive().default(1).optional(),
    limit: z.coerce.number().int().positive().max(100).default(10).optional(),
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

export const GRPODocNumLookupQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .openapi({ example: "6005", description: "DocNum contains search term" }),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(10)
    .optional()
    .openapi({ example: 10, description: "Max suggestions (hard capped at 100)" }),
});

// AvailablePOsQuerySchema: Ensures a valid vendor code is provided when looking up pending deliveries.
export const AvailablePOsQuerySchema = z.object({
  vendorCode: z.string().min(1),
});

// GRPOLineItemSchema: Tracks received quantities against a base PO.
// BaseType, BaseEntry, and BaseLine are CRITICAL for SAP document linkage.
const GRPOLineItemSchema = z.object({
  ItemCode: z.string().min(1),
  Quantity: z.number().positive(),
  UnitPrice: z.number().nonnegative().optional(),
  UoMCode: z.union([z.string(), z.number()]).optional(),
  UoMEntry: z.coerce.number().int().optional(),
  DiscountPercent: z.number().min(0).max(100).optional(),
  VatGroup: z.string().optional(),
  BaseType: z.number().optional(), // SAP Object Type (e.g., 22 for PO).
  BaseEntry: z.number().optional(), // docEntry of the originating PO.
  BaseLine: z.number().optional(), // LineNum of the item in the base PO.
  WarehouseCode: z.string().optional(),
});

// CreateGRPOInputSchema: Validates a new receipt document.
export const CreateGRPOInputSchema = z.object({
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
  NumAtCard: z.string().optional(),
  Address: z.string().optional().openapi({ description: "Bill To Address" }),
  Address2: z.string().optional().openapi({ description: "Ship To Address" }),
  DocumentLines: z.array(GRPOLineItemSchema).min(1),
});

// UpdateGRPOInputSchema: Edit flow accepts only delivery date and remarks/comments updates.
export const UpdateGRPOInputSchema = z
  .object({
    DocDueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    Comments: z.string().optional(),
    NumAtCard: z.string().optional(),
    Address: z.string().optional(),
    Address2: z.string().optional(),
  })
  .strict();

export type GRPOQuery = z.infer<typeof GRPOQuerySchema>;
export type GRPODocNumLookupQuery = z.infer<typeof GRPODocNumLookupQuerySchema>;
export type AvailablePOsQuery = z.infer<typeof AvailablePOsQuerySchema>;
export type CreateGRPOInput = z.infer<typeof CreateGRPOInputSchema>;
export type UpdateGRPOInput = z.infer<typeof UpdateGRPOInputSchema>;
