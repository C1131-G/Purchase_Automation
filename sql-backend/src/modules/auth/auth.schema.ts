import "@/config/zod";
import { z } from "zod";

export const LoginInputSchema = z.object({
  companyDB: z.string().min(1).trim().openapi({
    description: "Target company database name for multi-tenant login.",
    example: "SBODEMOUS",
  }),
  password: z.string().min(1).openapi({
    description: "User password (never logged).",
    example: "SecureP@ss123",
  }),
  username: z.string().min(1).trim().openapi({
    description: "Portal user identifier.",
    example: "admin_user",
  }),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;
