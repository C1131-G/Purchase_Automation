// Authentication Input Validation: Schemas for validating user credentials and tenant targets.

import { z } from "zod";

// LoginInputSchema: Validates the payload for the /login endpoint.
// It mandates the inclusion of the target company database to support multi-tenancy.
export const LoginInputSchema = z.object({
  username: z
    .string()
    .min(1)
    .trim()
    .openapi({ example: "admin_user", description: "User identifier" }),
  password: z.string().min(1).openapi({ example: "SecureP@ss123", description: "User password" }),
  companyDB: z
    .string()
    .min(1)
    .trim()
    .openapi({ example: "SBODEMOUS", description: "Target SAP Business One Database Name" }),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;
