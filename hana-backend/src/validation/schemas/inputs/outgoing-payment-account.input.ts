import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const AccountQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .openapi({ description: "Search by GLAccount name", example: "Cash" }),
  limit: z.coerce.number().int().positive().max(100).default(20).optional(),
});
