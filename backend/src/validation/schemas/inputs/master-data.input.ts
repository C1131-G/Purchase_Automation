// Master Data Query Validation: Schema for filtering read-only lookup data.

import { z } from "zod";

export const MasterDataQuerySchema = z.object({
  // search: Optional keyword for searching products, vendors, or customers.
  search: z.string().optional(),
});

export type MasterDataQuery = z.infer<typeof MasterDataQuerySchema>;
