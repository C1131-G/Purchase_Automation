// Sales Quotation Input Validation: Schemas for customer quotations and list filtering.

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { sapLotCollectionsFields } from "@/validation/schemas/inputs/sap-lot-collections.schema";
import {
  SAP_FIELD_MAX,
  sapOptionalCode,
  sapOptionalText,
  sapRequiredText,
} from "@/validation/schemas/inputs/sap-document-fields";
import { AttachmentInputSchema } from "@/modules/purchase-quotation/purchase-quotation.schema";

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

    // Smart Status Mapping: Convert "Open"/"Closed"/"Draft" to canonical values (Case-Insensitive)
    if (normalized.DocStatus) {
      const statusUpper = normalized.DocStatus.toUpperCase();
      if (statusUpper === "OPEN") {
        normalized.DocStatus = "O";
      } else if (statusUpper === "CLOSED") {
        normalized.DocStatus = "C";
      } else if (statusUpper === "DRAFT") {
        normalized.DocStatus = "D";
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
  DiscountPercent: z.number().min(0).max(100).optional(),
  ItemCode: sapRequiredText(SAP_FIELD_MAX.itemCode),
  Quantity: z.number().positive(),
  UnitPrice: z.number().nonnegative().optional(),
  UoMCode: z.union([z.string().max(SAP_FIELD_MAX.uomCode), z.number()]).optional(),
  UoMEntry: z.coerce.number().int().optional(),
  VatGroup: sapOptionalCode(SAP_FIELD_MAX.vatGroup),
  WarehouseCode: sapOptionalCode(SAP_FIELD_MAX.warehouseCode),
  LineNum: z.number().int().optional(),
  ...sapLotCollectionsFields,
});

// CreateSalesQuotationInputSchema: Validates a new sales quotation submission.
export const CreateSalesQuotationInputSchema = z.object({
  Address: sapOptionalText(SAP_FIELD_MAX.address),
  Address2: sapOptionalText(SAP_FIELD_MAX.address),
  CardCode: sapRequiredText(SAP_FIELD_MAX.cardCode), // Customer identification.
  Comments: sapOptionalText(SAP_FIELD_MAX.comments),
  DocDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  DocDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  DocumentLines: z.array(SalesQuotationLineItemSchema).min(1),
  NumAtCard: sapOptionalText(SAP_FIELD_MAX.numAtCard),
  SalesPersonCode: z.coerce.number().int().optional(),
  /** Explicit numbering series (NNM1.Series). When omitted, backend resolves SAP next series for branch. */
  Series: z.coerce.number().int().positive().optional(),
  /** Multi-branch document BPL. When omitted, backend maps from line warehouse OWHS.BPLid. */
  BPL_IDAssignedToInvoice: z.coerce.number().int().positive().optional(),
  Rounding: z.enum(["tYES", "tNO"]).optional(),
  RoundingDiffAmount: z.number().optional(),
  attachments: z.array(AttachmentInputSchema).optional(),
  isDraft: z.boolean().optional(),
  draftDocEntry: z.coerce.number().optional(),
});

// UpdateSalesQuotationInputSchema: Edit flow blocks customer updates (CardCode/CardName).
export const UpdateSalesQuotationInputSchema = z
  .object({
    Address: sapOptionalText(SAP_FIELD_MAX.address),
    Address2: sapOptionalText(SAP_FIELD_MAX.address),
    CardCode: sapOptionalText(SAP_FIELD_MAX.cardCode),
    Comments: sapOptionalText(SAP_FIELD_MAX.comments),
    DocDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    DocDueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    DocumentLines: z.array(SalesQuotationLineItemSchema).min(1).optional(),
    NumAtCard: sapOptionalText(SAP_FIELD_MAX.numAtCard),
    SalesPersonCode: z.coerce.number().int().optional(),
    Rounding: z.enum(["tYES", "tNO"]).optional(),
    RoundingDiffAmount: z.number().optional(),
    attachments: z.array(AttachmentInputSchema).optional(),
    isDraft: z.boolean().optional(),
    draftDocEntry: z.coerce.number().optional(),
  })
  .strict();

export type SalesQuotationQuery = z.infer<typeof SalesQuotationQuerySchema>;
export type SalesQuotationDocNumLookupQuery = z.infer<typeof SalesQuotationDocNumLookupQuerySchema>;
export type CreateSalesQuotationInput = z.infer<typeof CreateSalesQuotationInputSchema>;
export type UpdateSalesQuotationInput = z.infer<typeof UpdateSalesQuotationInputSchema>;
