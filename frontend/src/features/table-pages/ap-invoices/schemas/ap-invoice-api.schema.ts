import { z } from "zod";

export const apInvoiceListItemSchema = z.object({
  BalanceDue: z.union([z.number(), z.string()]).optional(),
  CardCode: z.string(),
  CardName: z.string(),
  DocCurr: z.string(),
  DocDate: z.string(),
  DocNum: z.number(),
  DocStatus: z.enum(["Open", "Partial", "Closed", "Draft"]),
  DocTotal: z.union([z.number(), z.string()]),
  id: z.number(),
});

export const apInvoiceListResponseSchema = z.object({
  data: z.array(apInvoiceListItemSchema),
  limit: z.number(),
  page: z.number(),
  success: z.boolean(),
  total: z.number(),
  totalPages: z.number(),
});

export const apInvoiceListParamsSchema = z.object({
  CardCode: z.string().optional(),
  CardName: z.string().optional(),
  DocDateEnd: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocNum: z.string().optional(),
  DocStatus: z.enum(["Open", "Partial", "Closed", "Draft"]).optional(),
  DocTotal: z.number().optional(),
  DocTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  sortBy: z.enum(["DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocStatus"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const apInvoiceDetailSchema = z.object({
  Address: z.string().nullable().optional(),
  Address2: z.string().nullable().optional(),
  CardCode: z.string(),
  CardName: z.string(),
  Comments: z.string().nullable().optional(),
  DocCurr: z.string(),
  DocDate: z.string(),
  DocDueDate: z.string(),
  DocEntry: z.number().optional(),
  DocNum: z.number(),
  DocStatus: z.enum(["O", "C", "Open", "Partial", "Closed", "Draft"]),
  DocTotal: z.union([z.number(), z.string()]),
  DocumentLines: z.array(
    z.object({
      BaseEntry: z.number().nullable().optional(),
      BaseLine: z.number().nullable().optional(),
      BaseType: z.number().nullable().optional(),
      DiscountPercent: z.number().optional(),
      ItemCode: z.string(),
      ItemDescription: z.string().optional(),
      LineNum: z.number(),
      LineTotal: z.number().optional(),
      Price: z.number(),
      Quantity: z.number(),
      TaxCode: z.string().optional(),
      UnitPrice: z.number().optional(),
      UoMCode: z.string().nullable().optional(),
      UoMEntry: z.number().nullable().optional(),
      VatGroup: z.string().optional(),
      VatPrcnt: z.number().optional(),
      WarehouseCode: z.string(),
    }),
  ),
  NumAtCard: z.string().nullable().optional(),
  SalesPersonCode: z.number().nullable().optional(),
  attachments: z.array(z.any()).optional(),
  id: z.number(),
});

export const createAPInvoiceInputSchema = z.object({
  Address: z.string().optional(),
  Address2: z.string().optional(),
  CardCode: z.string(),
  Comments: z.string().optional(),
  DocDate: z.string().optional(),
  DocDueDate: z.string().optional(),
  DocumentLines: z.array(
    z.object({
      BaseEntry: z.number().optional(),
      BaseLine: z.number().optional(),
      BaseType: z.number().optional(),
      DiscountPercent: z.number().optional(),
      ItemCode: z.string(),
      Price: z.number().optional(),
      Quantity: z.number(),
      UnitPrice: z.number().optional(),
      UoMCode: z.union([z.string(), z.number()]).optional(),
      UoMEntry: z.number().optional(),
      VatGroup: z.string().optional(),
      WarehouseCode: z.string().optional(),
    }),
  ),
  NumAtCard: z.string().optional(),
  SalesPersonCode: z.number().optional(),
  Series: z.number().optional(),
  attachments: z.array(z.any()).optional(),
});

export const updateAPInvoiceInputSchema = z.object({
  Comments: z.string().optional(),
  DocDueDate: z.string().optional(),
  NumAtCard: z.string().optional(),
  SalesPersonCode: z.number().optional(),
  attachments: z.array(z.any()).optional(),
});
