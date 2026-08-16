// GRPO Input Validation: Schemas for Goods Receipt PO filtering and submission.

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { sapLotCollectionsFields } from "@/validation/schemas/inputs/sap-lot-collections.schema";
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

// GRPOQuerySchema: Filters for the shipment delivery list view.
export const GRPOQuerySchema = z
  .object({
    // Standard SAP B1 Fields
    DocNum: z
      .string()
      .optional()
      .openapi({ description: "Document Number (DocNum)", example: "6005001" }),
    CardCode: z
      .string()
      .optional()
      .openapi({ description: "Vendor Code (CardCode)", example: "V1005" }),
    CardName: z
      .string()
      .optional()
      .openapi({ description: "Vendor Name (CardName)", example: "Acme Corp" }),
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
      .openapi({ description: "DocTotal comparison value", example: 1736.5 }),
    sortBy: z
      .enum(["DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocStatus"])
      .optional()
      .openapi({ description: "Sort field", example: "DocDate" }),
    sortOrder: z
      .enum(["asc", "desc"])
      .optional()
      .openapi({ description: "Sort direction", example: "desc" }),

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

export const GRPODocNumLookupQuerySchema = z.object({
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
    .openapi({ description: "DocNum contains search term", example: "6005" }),
});

// AvailablePOsQuerySchema: Ensures a valid vendor code is provided when looking up pending deliveries.
export const AvailablePOsQuerySchema = z.object({
  vendorCode: z.string().min(1),
});

// GRPOLineItemSchema: Tracks received quantities against a base PO.
// BaseType, BaseEntry, and BaseLine are CRITICAL for SAP document linkage.
const GRPOLineItemSchema = z.object({
  BaseEntry: z.number().optional(), // docEntry of the originating PO.
  BaseLine: z.number().optional(), // LineNum of the item in the base PO.
  BaseType: z.number().optional(), // SAP Object Type (e.g., 22 for PO).
  DiscountPercent: z.number().min(0).max(100).optional(),
  ItemCode: sapRequiredText(SAP_FIELD_MAX.itemCode),
  LineNum: z.coerce.number().int().nonnegative().optional(),
  Quantity: z.number().positive(),
  UnitPrice: z.number().nonnegative().optional(),
  UoMCode: z.union([z.string().max(SAP_FIELD_MAX.uomCode), z.number()]).optional(),
  UoMEntry: z.coerce.number().int().optional(),
  VatGroup: sapOptionalCode(SAP_FIELD_MAX.vatGroup),
  WarehouseCode: sapOptionalCode(SAP_FIELD_MAX.warehouseCode),
  ...sapLotCollectionsFields,
});

// CreateGRPOInputSchema: Validates a new receipt document.
export const CreateGRPOInputSchema = z.object({
  Address: sapOptionalText(SAP_FIELD_MAX.address).openapi({ description: "Bill To Address" }),
  Address2: sapOptionalText(SAP_FIELD_MAX.address).openapi({ description: "Ship To Address" }),
  CardCode: sapRequiredText(SAP_FIELD_MAX.cardCode),
  Comments: sapOptionalText(SAP_FIELD_MAX.comments),
  DocDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  DocDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  DocumentLines: z.array(GRPOLineItemSchema).min(1),
  NumAtCard: sapOptionalText(SAP_FIELD_MAX.numAtCard),
  SalesPersonCode: z.coerce.number().int().optional(),
  attachments: z.array(AttachmentInputSchema).optional(),
  isDraft: z.boolean().optional(),
  draftDocEntry: z.coerce.number().optional(),
  ...sapDocumentBranchFields,
  ...sapDocumentSeriesFields,
});

// UpdateGRPOInputSchema: Edit flow accepts only delivery date and remarks/comments updates.
export const UpdateGRPOInputSchema = z
  .object({
    Address: sapOptionalText(SAP_FIELD_MAX.address),
    Address2: sapOptionalText(SAP_FIELD_MAX.address),
    Comments: sapOptionalText(SAP_FIELD_MAX.comments),
    DocDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    DocDueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    DocumentLines: z.array(GRPOLineItemSchema).min(1).optional(),
    NumAtCard: sapOptionalText(SAP_FIELD_MAX.numAtCard),
    SalesPersonCode: z.coerce.number().int().optional(),
    attachments: z.array(AttachmentInputSchema).optional(),
    isDraft: z.boolean().optional(),
    CardCode: sapOptionalText(SAP_FIELD_MAX.cardCode),
    CardName: sapOptionalText(SAP_FIELD_MAX.cardName),
    draftDocEntry: z.coerce.number().optional(),
    ...sapDocumentBranchFields,
  })
  .strict();

export type GRPOQuery = z.infer<typeof GRPOQuerySchema>;
export type GRPODocNumLookupQuery = z.infer<typeof GRPODocNumLookupQuerySchema>;
export type AvailablePOsQuery = z.infer<typeof AvailablePOsQuerySchema>;
export type CreateGRPOInput = z.infer<typeof CreateGRPOInputSchema>;
export type UpdateGRPOInput = z.infer<typeof UpdateGRPOInputSchema>;
