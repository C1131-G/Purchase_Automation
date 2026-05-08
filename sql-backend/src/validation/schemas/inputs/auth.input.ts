import { z } from "@/config/zod";

export const LoginInputSchema = z.object({
  companyDB: z.string().min(1, "Company DB is required"),
  password: z.string().min(1, "Password is required"),
  username: z.string().min(1, "Username is required"),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;
