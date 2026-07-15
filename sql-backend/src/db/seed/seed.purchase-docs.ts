import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { seedPurchaseBillingDocs } from "./seed.purchase-billing-docs";
import { seedPurchaseQuotationsAndOrders } from "./seed.purchase-order-order-docs";

export async function seedPurchaseDocs(
  db: NodePgDatabase<Record<string, never>>,
  tenant: { prefix: string },
  seedCurrency: string,
  bpVendors: any[],
  items: any[],
) {
  const poEntries = await seedPurchaseQuotationsAndOrders(
    db,
    tenant,
    seedCurrency,
    bpVendors,
    items,
  );
  const apInvoiceEntries = await seedPurchaseBillingDocs(
    db,
    tenant,
    seedCurrency,
    bpVendors,
    items,
    poEntries,
  );

  return {
    apInvoiceEntries,
    poEntries,
  };
}
