// Invoice Input Validation: Schemas for AP/AR invoices and list filtering.

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  SAP_FIELD_MAX,
  sapDocumentSeriesFields,
  sapOptionalCode,
  sapOptionalText,
  sapRequiredText,
} from "@/validation/schemas/inputs/sap-document-fields";
import { AttachmentInputSchema } from "@/modules/purchase-quotation/purchase-quotation.schema";

extendZodWithOpenApi(z);

// InvoiceQuerySchema: Filters for the invoice history list.
export const InvoiceQuerySchema = z
  .object({
    // Standard SAP B1 Fields
    DocNum: z
      .string()
      .optional()
      .openapi({ description: "Document Number (DocNum)", example: "2001034" }),
    CardCode: z
      .string()
      .optional()
      .openapi({ description: "BP Code (CardCode)", example: "V1002" }),
    CardName: z.string().optional().openapi({
      description: "BP Name (CardName)",
      example: "Micro Chips Inc.",
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
    NumAtCard: z.string().optional().openapi({
      description: "Customer/Vendor Reference (NumAtCard)",
      example: "122",
    }),

    page: z.coerce.number().int().positive().default(1).optional(),
    limit: z.coerce.number().int().positive().max(100).default(10).optional(),
    sortBy: z
      .enum(["DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "NumAtCard", "DocStatus"])
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

export const InvoiceDocNumLookupQuerySchema = z.object({
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
    .openapi({ description: "DocNum contains search term", example: "2001" }),
});

// InvoiceLineItemSchema: Rows in the invoice document.
const InvoiceLineItemSchema = z.object({
  BaseEntry: z.number().int().optional(),
  BaseLine: z.number().int().optional(),
  BaseType: z.number().int().optional(),
  DiscountPercent: z.number().min(0).max(100).optional(),
  ItemCode: sapRequiredText(SAP_FIELD_MAX.itemCode),
  Price: z.number().nonnegative().optional(), // SAP 'Price' field vs 'UnitPrice'.
  Quantity: z.number().positive(),
  UnitPrice: z.number().nonnegative().optional(),
  UoMCode: z.union([z.string().max(SAP_FIELD_MAX.uomCode), z.number()]).optional(),
  UoMEntry: z.coerce.number().int().optional(),
  VatGroup: sapOptionalCode(SAP_FIELD_MAX.vatGroup),
  WarehouseCode: sapOptionalCode(SAP_FIELD_MAX.warehouseCode),
  LineNum: z.number().int().optional(),
});

// CreateInvoiceInputSchema: Validates new invoice submissions.
export const CreateInvoiceInputSchema = z.object({
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
  DocumentLines: z.array(InvoiceLineItemSchema).min(1),
  NumAtCard: sapOptionalText(SAP_FIELD_MAX.numAtCard), // Customer/Vendor reference number (BP Ref No).
  SalesPersonCode: z.coerce.number().int().optional(),
  Rounding: z.enum(["tYES", "tNO"]).optional(),
  RoundingDiffAmount: z.number().optional(), // Sales Employee code (OINV.SlpCode).
  attachments: z.array(AttachmentInputSchema).optional(),
  isDraft: z.boolean().optional(),
  draftDocEntry: z.coerce.number().int().optional(),
  ...sapDocumentSeriesFields,
});

// UpdateInvoiceInputSchema: Edit flow accepts only delivery date and remarks/comments updates.
export const UpdateInvoiceInputSchema = z
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
    DocumentLines: z.array(InvoiceLineItemSchema).optional(),
    NumAtCard: sapOptionalText(SAP_FIELD_MAX.numAtCard),
    SalesPersonCode: z.coerce.number().int().optional(),
    attachments: z.array(AttachmentInputSchema).optional(),
    isDraft: z.boolean().optional(),
    CardCode: sapOptionalText(SAP_FIELD_MAX.cardCode),
    CardName: sapOptionalText(SAP_FIELD_MAX.cardName),
    draftDocEntry: z.coerce.number().optional(),
  })
  .strict();

export type InvoiceQuery = z.infer<typeof InvoiceQuerySchema>;
export type InvoiceDocNumLookupQuery = z.infer<typeof InvoiceDocNumLookupQuerySchema>;
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInputSchema>;
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceInputSchema>;
