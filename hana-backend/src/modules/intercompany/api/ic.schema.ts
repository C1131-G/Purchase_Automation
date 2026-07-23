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
