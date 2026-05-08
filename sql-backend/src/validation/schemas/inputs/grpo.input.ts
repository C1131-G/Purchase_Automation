import { z } from "@/config/zod";

export const GRPOQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
  search: z.string().optional(),
  status: z.enum(["O", "C"]).optional(),
});

export const GRPODocNumLookupQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
  search: z.string().optional(),
});

export const AvailablePOsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
  search: z.string().optional(),
});

export const CreateGRPOInputSchema = z.object({
  cardCode: z.string().min(1),
  comments: z.string().optional(),
  docDate: z.string().transform((val) => new Date(val)),
  lines: z
    .array(
      z.object({
        itemCode: z.string(),
        quantity: z.number().positive(),
        warehouse: z.string().optional(),
      }),
    )
    .min(1),
  poDocEntry: z.number().positive(),
});

export const UpdateGRPOInputSchema = z.object({
  comments: z.string().optional(),
});

export type GRPOQuery = z.infer<typeof GRPOQuerySchema>;
export type GRPODocNumLookupQuery = z.infer<typeof GRPODocNumLookupQuerySchema>;
export type AvailablePOsQuery = z.infer<typeof AvailablePOsQuerySchema>;
export type CreateGRPOInput = z.infer<typeof CreateGRPOInputSchema>;
export type UpdateGRPOInput = z.infer<typeof UpdateGRPOInputSchema>;
