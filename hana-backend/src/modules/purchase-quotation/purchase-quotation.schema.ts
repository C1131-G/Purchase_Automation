// Purchase Quotation Input Validation: Schemas for vendor quotations and list filtering.

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
    /** Copy-from only: keep PQs whose RFQ is SUBMITTED or COMPLETED. */
    rfqSubmittedOnly: z
      .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
      .optional()
      .transform((value) => value === true || value === "true" || value === "1"),
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
  DiscountPercent: z.number().min(0).max(100).optional(),
  ItemCode: sapRequiredText(SAP_FIELD_MAX.itemCode),
  /** Quoted quantity — PQT1.Quantity / DocTotal (0 when not yet quoted). */
  Quantity: z.number().nonnegative(),
  /** Required quantity — PQT1.PQTReqQty (Service Layer RequiredQuantity). */
  RequiredQuantity: z.number().positive().optional(),
  ReqDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  /** Quoted / shipping date — PQT1.ShipDate. */
  ShipDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  UnitPrice: z.number().nonnegative().optional(),
  UoMCode: z.union([z.string().max(SAP_FIELD_MAX.uomCode), z.number()]).optional(),
  UoMEntry: z.coerce.number().int().optional(),
  VatGroup: sapOptionalCode(SAP_FIELD_MAX.vatGroup),
  WarehouseCode: sapOptionalCode(SAP_FIELD_MAX.warehouseCode),
  LineNum: z.number().int().optional(),
});

export const AttachmentInputSchema = z.object({
  sourcePath: z.string(),
  fileName: z.string(),
  fileExtension: z.string(),
  freeText: sapOptionalText(SAP_FIELD_MAX.attachmentFreeText),
  attachmentDate: z.string().optional(),
});

// CreatePurchaseQuotationInputSchema: Validates a new purchase quotation submission.
export const CreatePurchaseQuotationInputSchema = z.object({
  Address: sapOptionalText(SAP_FIELD_MAX.address),
  Address2: sapOptionalText(SAP_FIELD_MAX.address),
  CardCode: sapRequiredText(SAP_FIELD_MAX.cardCode),
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
  RequriedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  DocumentLines: z.array(PurchaseQuotationLineItemSchema).optional(),
  SalesPersonCode: z.coerce.number().int().optional(),
  Rounding: z.enum(["tYES", "tNO"]).optional(),
  RoundingDiffAmount: z.number().optional(),
  DocCurrency: sapOptionalText(SAP_FIELD_MAX.docCurrency),
  attachments: z.array(AttachmentInputSchema).optional(),
  isDraft: z.boolean().optional(),
  draftDocEntry: z.coerce.number().optional(),
  ...sapDocumentBranchFields,
  ...sapDocumentSeriesFields,
});

// UpdatePurchaseQuotationInputSchema: Edit flow blocks vendor updates (CardCode/CardName).
export const UpdatePurchaseQuotationInputSchema = z.object({
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
  RequriedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  DocumentLines: z.array(PurchaseQuotationLineItemSchema).optional(),
  SalesPersonCode: z.coerce.number().int().optional(),
  Rounding: z.enum(["tYES", "tNO"]).optional(),
  RoundingDiffAmount: z.number().optional(),
  DocCurrency: sapOptionalText(SAP_FIELD_MAX.docCurrency),
  attachments: z.array(AttachmentInputSchema).optional(),
  isDraft: z.boolean().optional(),
  CardCode: sapOptionalText(SAP_FIELD_MAX.cardCode),
  CardName: sapOptionalText(SAP_FIELD_MAX.cardName),
  draftDocEntry: z.coerce.number().optional(),
  ...sapDocumentBranchFields,
});

export type PurchaseQuotationQuery = z.infer<typeof PurchaseQuotationQuerySchema>;
export type PurchaseQuotationDocNumLookupQuery = z.infer<
  typeof PurchaseQuotationDocNumLookupQuerySchema
>;
export type CreatePurchaseQuotationInput = z.infer<typeof CreatePurchaseQuotationInputSchema>;
export type UpdatePurchaseQuotationInput = z.infer<typeof UpdatePurchaseQuotationInputSchema>;
