import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const ItemMasterQuerySchema = z.object({
  ItemCode: z.string().optional().openapi({ description: "Filter by Item Code" }),
  ItemName: z.string().optional().openapi({ description: "Filter by Item Name" }),
  frozenFor: z.string().optional().openapi({ description: "Filter by frozen status (Y/N)" }),
  validFor: z.string().optional().openapi({ description: "Filter by valid status (Y/N)" }),
  ItmsGrpCod: z.coerce
    .number()
    .int()
    .optional()
    .openapi({ description: "Filter by Item Group Code" }),
  InvntryUom: z.string().optional().openapi({ description: "Filter by Unit of Measure" }),
  CodeBars: z.string().optional().openapi({ description: "Filter by Bar Code" }),
  sortBy: z
    .enum(["ItemCode", "ItemName", "ItmsGrpCod", "OnHand", "AvgPrice", "InvntItem", "CodeBars"])
    .optional()
    .openapi({ description: "Sort field" }),
  sortOrder: z.enum(["asc", "desc"]).optional().openapi({ description: "Sort order" }),
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),
});

export type ItemMasterQuery = z.infer<typeof ItemMasterQuerySchema>;

export const ItemMasterLookupQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100000).default(10).optional().openapi({
    description: "Max suggestions (hard capped at 100000)",
    example: 10,
  }),
  search: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .openapi({ description: "Search term for suggestion", example: "A00001" }),
});

export type ItemMasterLookupQuery = z.infer<typeof ItemMasterLookupQuerySchema>;
