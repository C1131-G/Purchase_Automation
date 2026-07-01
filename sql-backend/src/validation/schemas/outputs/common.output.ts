import { z } from "zod";

export const SuccessResponseSchema = z.object({
  data: z.unknown().optional(),
  message: z.string().optional(),
  success: z.literal(true),
});

export const ErrorResponseSchema = z.object({
  details: z.unknown().optional(),
  errorCode: z.string(),
  message: z.string(),
  status: z.number(),
  success: z.literal(false),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.object({
      items: z.array(itemSchema),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      totalPages: z.number(),
    }),
    success: z.literal(true),
  });
