import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const GoodsIssueQuerySchema = z
  .object({
    DocNum: z.string().optional().openapi({ description: "Filter by document number" }),
    Comments: z.string().optional().openapi({ description: "Filter by comments" }),
    DocStatus: z.string().optional().openapi({ description: "Filter by status" }),
    DocDateStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    DocDateEnd: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    TaxDateStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    TaxDateEnd: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
    DocTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
    DocTotal: z.coerce.number().optional(),
    sortBy: z.enum(["DocNum", "DocDate", "TaxDate", "DocTotal"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
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

export type GoodsIssueQuery = z.infer<typeof GoodsIssueQuerySchema>;

export const GoodsIssueDocNumLookupQuerySchema = z.object({
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
    .openapi({ description: "DocNum contains search term", example: "8001" }),
});

export type GoodsIssueDocNumLookupQuery = z.infer<typeof GoodsIssueDocNumLookupQuerySchema>;
