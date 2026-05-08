import type { z } from "zod";

import type { PurchaseOrderQuerySchema } from "@/validation/schemas/inputs/purchase-order.input";

export type PurchaseOrderQuery = z.infer<typeof PurchaseOrderQuerySchema>;

export type PurchaseOrderFilters = PurchaseOrderQuery;
