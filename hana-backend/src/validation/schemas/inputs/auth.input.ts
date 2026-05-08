// Authentication Input Validation: Schemas for validating user credentials and tenant targets.

import { z } from "zod";

// LoginInputSchema: Validates the payload for the /login endpoint.
// It mandates the inclusion of the target company database to support multi-tenancy.
export const LoginInputSchema = z.object({
  companyDB: z.string().min(1).trim().openapi({
    description: "Target SAP Business One Database Name",
    example: "SBODEMOUS",
  }),
  password: z.string().min(1).openapi({ description: "User password", example: "SecureP@ss123" }),
  username: z
    .string()
    .min(1)
    .trim()
    .openapi({ description: "User identifier", example: "admin_user" }),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;
