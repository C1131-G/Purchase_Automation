import type { z } from "zod";

import type { SalesOrderQuerySchema } from "@/validation/schemas/inputs/sales-order.input";

export type SalesOrderQuery = z.infer<typeof SalesOrderQuerySchema>;

export type SalesOrderFilters = SalesOrderQuery;
