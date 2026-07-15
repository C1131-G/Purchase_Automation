import type { z } from "zod";

import type { PurchaseOrderQuerySchema } from "./purchase-order.schema";

export type PurchaseOrderQuery = z.infer<typeof PurchaseOrderQuerySchema>;

export type PurchaseOrderFilters = PurchaseOrderQuery;
