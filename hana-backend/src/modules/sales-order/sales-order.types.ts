import type { z } from "zod";

import type { SalesOrderQuerySchema } from "./sales-order.schema";

export type SalesOrderQuery = z.infer<typeof SalesOrderQuerySchema>;

export type SalesOrderFilters = SalesOrderQuery;
