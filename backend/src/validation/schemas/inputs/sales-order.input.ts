// Sales Order Input Validation: Schemas for customer orders and list filtering.

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// SalesOrderQuerySchema: Filters for the customer-facing order list.
export const SalesOrderQuerySchema = z
  .object({
    // Standard SAP B1 Fields
    DocNum: z
      .string()
      .optional()
      .openapi({ example: "9001005", description: "Document Number (DocNum)" }),
    CardCode: z
      .string()
      .optional()
      .openapi({ example: "C0019", description: "Customer Code (CardCode)" }),
    CardName: z
      .string()
      .optional()
      .openapi({ example: "Tech Solutions Ltd", description: "Customer Name (CardName)" }),
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
    DocTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
    DocTotal: z.coerce.number().optional(),

    page: z.coerce.number().int().positive().default(1).optional(),
    limit: z.coerce.number().int().positive().max(100).default(10).optional(),
    sortBy: z
      .enum(["DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocStatus"])
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

    // Smart Status Mapping: Convert "Open"/"Closed" to "O"/"C" (Case-Insensitive)
    if (normalized.DocStatus) {
      const statusUpper = normalized.DocStatus.toUpperCase();
      if (statusUpper === "OPEN") normalized.DocStatus = "O";
      if (statusUpper === "CLOSED") normalized.DocStatus = "C";
    }

    return normalized;
  });

// SalesOrderLineItemSchema: Individual items requested in the order.
const SalesOrderLineItemSchema = z.object({
  ItemCode: z.string().min(1),
  Quantity: z.number().positive(),
  UnitPrice: z.number().nonnegative().optional(),
  TaxCode: z.string().optional(),
  WarehouseCode: z.string().optional(),
  DiscountPercent: z.number().min(0).max(100).optional(),
});

// CreateSalesOrderInputSchema: Validates a new sales order submission.
export const CreateSalesOrderInputSchema = z.object({
  CardCode: z.string().min(1), // Customer identification.
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
  DocumentLines: z.array(SalesOrderLineItemSchema).min(1),
});

// UpdateSalesOrderInputSchema: Allows modification of open sales orders.
export const UpdateSalesOrderInputSchema = CreateSalesOrderInputSchema.partial().extend({
  Address: z.string().optional(),
});

export type SalesOrderQuery = z.infer<typeof SalesOrderQuerySchema>;
export type CreateSalesOrderInput = z.infer<typeof CreateSalesOrderInputSchema>;
export type UpdateSalesOrderInput = z.infer<typeof UpdateSalesOrderInputSchema>;
