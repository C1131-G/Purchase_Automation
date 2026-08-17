// Purchase Order Input Validation: Schemas for filtering lists and validating creation/update payloads.

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  SAP_FIELD_MAX,
  sapDocumentBranchFields,
  sapDocumentSeriesFields,
  sapOptionalCode,
  sapOptionalText,
  sapRequiredText,
} from "@/validation/schemas/inputs/sap-document-fields";
import { AttachmentInputSchema } from "@/modules/purchase-quotation/purchase-quotation.schema";

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
  ItemCode: sapRequiredText(SAP_FIELD_MAX.itemCode),
  LineNum: z.number().int().optional(),
  Quantity: z.number().positive(),
  UnitPrice: z.number().nonnegative().optional(), // SAP can auto-fetch if omitted
  UoMCode: z.union([z.string().max(SAP_FIELD_MAX.uomCode), z.number()]).optional(),
  UoMEntry: z.coerce.number().int().optional(),
  VatGroup: sapOptionalCode(SAP_FIELD_MAX.vatGroup),
  WarehouseCode: sapOptionalCode(SAP_FIELD_MAX.warehouseCode),
  BaseType: z.number().int().optional(),
  BaseEntry: z.number().int().optional(),
  BaseLine: z.number().int().optional(),
});

// CreatePurchaseOrderInputSchema: Validates the full payload for a new procurement document.
export const CreatePurchaseOrderInputSchema = z.object({
  Address: sapOptionalText(SAP_FIELD_MAX.address).openapi({ description: "Bill To Address" }),
  Address2: sapOptionalText(SAP_FIELD_MAX.address).openapi({ description: "Ship To Address" }),
  CardCode: sapRequiredText(SAP_FIELD_MAX.cardCode).openapi({
    description: "Vendor Card Code",
    example: "V1000",
  }),
  Comments: sapOptionalText(SAP_FIELD_MAX.comments).openapi({
    description: "Comments",
    example: "Urgent delivery required",
  }),
  NumAtCard: sapOptionalText(SAP_FIELD_MAX.numAtCard).openapi({
    description: "Vendor Reference Number (NumAtCard)",
    example: "REF-12345",
  }),
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
  attachments: z.array(AttachmentInputSchema).optional(),
  isDraft: z.boolean().optional(),
  draftDocEntry: z.coerce.number().optional(),
  ...sapDocumentBranchFields,
  ...sapDocumentSeriesFields,
});

// UpdatePurchaseOrderInputSchema: Edit flow blocks vendor updates (CardCode).
export const UpdatePurchaseOrderInputSchema = z
  .object({
    Address: sapOptionalText(SAP_FIELD_MAX.address),
    Address2: sapOptionalText(SAP_FIELD_MAX.address),
    Comments: sapOptionalText(SAP_FIELD_MAX.comments),
    NumAtCard: sapOptionalText(SAP_FIELD_MAX.numAtCard),
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
    Rounding: z.enum(["tYES", "tNO"]).optional(),
    RoundingDiffAmount: z.number().optional(),
    attachments: z.array(AttachmentInputSchema).optional(),
    isDraft: z.boolean().optional(),
    CardCode: sapOptionalText(SAP_FIELD_MAX.cardCode),
    CardName: sapOptionalText(SAP_FIELD_MAX.cardName),
    draftDocEntry: z.coerce.number().optional(),
    ...sapDocumentBranchFields,
    // Series is locked after numbering; accept and ignore if a client still sends it.
    ...sapDocumentSeriesFields,
  })
  .strict();

export type PurchaseOrderQuery = z.infer<typeof PurchaseOrderQuerySchema>;
export type PurchaseOrderDocNumLookupQuery = z.infer<typeof PurchaseOrderDocNumLookupQuerySchema>;
export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderInputSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof UpdatePurchaseOrderInputSchema>;
