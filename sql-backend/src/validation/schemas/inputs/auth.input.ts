import { z } from "zod";

export const LoginInputSchema = z.object({
  companyDB: z.string().min(1),
  password: z.string().min(1),
  username: z.string().min(1).trim(),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;
