import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { seedSalesBillingDocs } from "./seed.sales-billing-docs";
import { seedSalesQuotationAndOrderDocs } from "./seed.sales-orders-docs";

export async function seedSalesDocs(
  db: NodePgDatabase<Record<string, never>>,
  tenant: { prefix: string },
  seedCurrency: string,
  bpCustomers: any[],
  items: any[],
) {
  const { soEntries } = await seedSalesQuotationAndOrderDocs(
    db,
    tenant,
    seedCurrency,
    bpCustomers,
    items,
  );
  const { arInvoiceEntries } = await seedSalesBillingDocs(
    db,
    tenant,
    seedCurrency,
    bpCustomers,
    items,
  );
  return { arInvoiceEntries, soEntries };
}
