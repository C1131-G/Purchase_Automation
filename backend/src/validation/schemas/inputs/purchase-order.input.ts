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

    Canceled: z.string().optional().openapi({ example: "N", description: "Canceled status (Y/N)" }),

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

// PurchaseOrderLineItemSchema: Validates individual rows in the document.
// Quantities and Prices must be non-negative to ensure data integrity in SAP.
const PurchaseOrderLineItemSchema = z.object({
  ItemCode: z.string().min(1),
  Quantity: z.number().positive(),
  UnitPrice: z.number().nonnegative().optional(), // SAP can auto-fetch if omitted
  TaxCode: z.string().optional(),
  WarehouseCode: z.string().optional(),
  DiscountPercent: z.number().min(0).max(100).optional(),
});

// CreatePurchaseOrderInputSchema: Validates the full payload for a new procurement document.
export const CreatePurchaseOrderInputSchema = z.object({
  CardCode: z.string().min(1).openapi({ example: "V1000", description: "Vendor Card Code" }),
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
  Address: z.string().optional().openapi({ description: "Shipping/Billing Address" }),
  DocumentLines: z
    .array(PurchaseOrderLineItemSchema)
    .min(1)
    .openapi({ description: "List of items in the purchase order" }),
});

// UpdatePurchaseOrderInputSchema: Allows modification of specific fields on an existing document.
export const UpdatePurchaseOrderInputSchema = CreatePurchaseOrderInputSchema.partial().extend({
  Address: z.string().optional(),
});

export type PurchaseOrderQuery = z.infer<typeof PurchaseOrderQuerySchema>;
export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderInputSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof UpdatePurchaseOrderInputSchema>;
