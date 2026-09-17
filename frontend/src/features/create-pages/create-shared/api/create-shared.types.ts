import type { z } from "zod";

import type {
  lookupItemSchema,
  productLookupItemSchema,
  productWarehouseStockItemSchema,
} from "@/features/create-pages/create-shared/schemas/create-shared-api.schema";

export type LookupItem = z.infer<typeof lookupItemSchema>;
export type ProductLookupItem = z.infer<typeof productLookupItemSchema>;
export type ProductWarehouseStockItem = z.infer<typeof productWarehouseStockItemSchema>;
export interface MasterDataResponse<T> {
  success: boolean;
  data: T[];
}
