// Organization Query Validation: Schema for filtering the list of available tenants.

import { z } from "zod";

export const OrganizationQuerySchema = z.object({
  // active: Optional filter to only show organizations marked as currently usable in the portal.
  active: z.enum(["Y", "N"]).optional(),
});

export type OrganizationQuery = z.infer<typeof OrganizationQuerySchema>;
