import { z } from "zod";

export const IcHealthResponseSchema = z.object({
  data: z.object({
    module: z.literal("intercompany"),
    ok: z.literal(true),
    phase: z.string(),
  }),
  success: z.literal(true),
});

export type IcHealthResponse = z.infer<typeof IcHealthResponseSchema>;

/** Seller fill: unit price, quoted qty, delivery date, discount %. itemCode rejected downstream. */
export const UpdateRfqBodySchema = z.object({
  lines: z
    .array(
      z
        .object({
          deliveryDate: z.string().nullable().optional(),
          discount: z.number().nullable().optional(),
          itemCode: z.unknown().optional(),
          lineNum: z.number().int(),
          quantity: z.number().positive().nullable().optional(),
          unitPrice: z.number(),
        })
        .strict(),
    )
    .min(1),
});

export type UpdateRfqBody = z.infer<typeof UpdateRfqBodySchema>;

export const RfqIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const NotificationIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
