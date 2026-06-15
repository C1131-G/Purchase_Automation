import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const IncomingAccountQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .openapi({ description: "Search by Account name", example: "Cash" }),
  limit: z.coerce.number().int().positive().max(500).default(500).optional(),
});
