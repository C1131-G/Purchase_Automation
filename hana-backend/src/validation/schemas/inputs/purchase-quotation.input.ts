// Purchase Quotation Input Validation: Schemas for vendor quotations and list filtering.

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// PurchaseQuotationQuerySchema: Filters for the vendor-facing quotation list.
export const PurchaseQuotationQuerySchema = z
  .object({
    DocNum: z
      .string()
      .optional()
      .openapi({ description: "Document Number (DocNum)", example: "1001" }),
    CardCode: z
      .string()
      .optional()
      .openapi({ description: "Vendor Code (CardCode)", example: "V00123" }),
    CardName: z.string().optional().openapi({
      description: "Vendor Name (CardName)",
      example: "ABC Suppliers Ltd",
    }),
    DocStatus: z.string().optional().openapi({
      description: "Document Status (O=Open, C=Closed)",
      example: "Open",
    }),
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
    const normalized = { ...data };

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

export const PurchaseQuotationDocNumLookupQuerySchema = z.object({
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

// PurchaseQuotationLineItemSchema: Individual items requested in the quotation.
const PurchaseQuotationLineItemSchema = z.object({
  DiscountPercent: z.number().optional(),
  ItemCode: z.string().min(1),
  Quantity: z.number().positive(),
  ReqDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  UnitPrice: z.number().nonnegative().optional(),
  UoMCode: z.union([z.string(), z.number()]).optional(),
  UoMEntry: z.coerce.number().int().optional(),
  VatGroup: z.string().optional(),
  WarehouseCode: z.string().optional(),
  LineNum: z.number().int().optional(),
});

// CreatePurchaseQuotationInputSchema: Validates a new purchase quotation submission.
export const CreatePurchaseQuotationInputSchema = z.object({
  Address: z.string().optional(),
  CardCode: z.string().min(1),
  Comments: z.string().optional(),
  NumAtCard: z.string().optional(),
  DocDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  DocDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  RequriedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  DocumentLines: z.array(PurchaseQuotationLineItemSchema).min(1),
  SalesPersonCode: z.coerce.number().int().optional(),
});

// UpdatePurchaseQuotationInputSchema: Edit flow blocks vendor updates (CardCode/CardName).
export const UpdatePurchaseQuotationInputSchema = z
  .object({
    Address: z.string().optional(),
    Comments: z.string().optional(),
    NumAtCard: z.string().optional(),
    DocDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    DocDueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    RequriedDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    DocumentLines: z.array(PurchaseQuotationLineItemSchema).min(1).optional(),
    SalesPersonCode: z.coerce.number().int().optional(),
  })
  .strict();

export type PurchaseQuotationQuery = z.infer<typeof PurchaseQuotationQuerySchema>;
export type PurchaseQuotationDocNumLookupQuery = z.infer<
  typeof PurchaseQuotationDocNumLookupQuerySchema
>;
export type CreatePurchaseQuotationInput = z.infer<typeof CreatePurchaseQuotationInputSchema>;
export type UpdatePurchaseQuotationInput = z.infer<typeof UpdatePurchaseQuotationInputSchema>;
