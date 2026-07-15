import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { seedInventoryDocs } from "./seed.inventory-docs";
import { seedPaymentDocs } from "./seed.payment-docs";
import { seedPurchaseDocs } from "./seed.purchase-docs";
import { seedSalesDocs } from "./seed.sales-docs";

export async function seedTenantDocuments(
  db: NodePgDatabase<Record<string, never>>,
  tenant: { dbName: string; prefix: string; seed: number },
  seedCurrency: string,
  referenceData: { bpCustomers: any[]; bpVendors: any[]; items: any[] },
) {
  const { bpCustomers, bpVendors, items } = referenceData;

  const purchaseResult = await seedPurchaseDocs(db, tenant, seedCurrency, bpVendors, items);
  const salesResult = await seedSalesDocs(db, tenant, seedCurrency, bpCustomers, items);

  await seedPaymentDocs(
    db,
    seedCurrency,
    bpVendors,
    bpCustomers,
    purchaseResult.apInvoiceEntries,
    salesResult.arInvoiceEntries,
  );

  await seedInventoryDocs(db, tenant, items);
}
