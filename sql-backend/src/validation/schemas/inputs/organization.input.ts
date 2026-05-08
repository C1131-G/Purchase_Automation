import { z } from "@/config/zod";

export const OrganizationQuerySchema = z.object({
  search: z.string().optional(),
});

export type OrganizationQuery = z.infer<typeof OrganizationQuerySchema>;
