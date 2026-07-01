import { z } from "zod";

export const LoginInputSchema = z.object({
  password: z.string().min(1),
  username: z.string().min(1).trim(),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;
