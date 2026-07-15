import { faker } from "@faker-js/faker";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import postgres from "pg";

import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";
import { ensureDatabaseExists } from "@/db/client";
import { adminSettings } from "@/db/schema/admin-settings";
import { apCreditMemoLines } from "@/db/schema/ap-credit-memo-lines";
import { apCreditMemos } from "@/db/schema/ap-credit-memos";
import { apInvoiceLines } from "@/db/schema/ap-invoice-lines";
import { apInvoices } from "@/db/schema/ap-invoices";
import { arCreditMemoLines } from "@/db/schema/ar-credit-memo-lines";
import { arCreditMemos } from "@/db/schema/ar-credit-memos";
import { arInvoiceLines } from "@/db/schema/ar-invoice-lines";
import { arInvoices } from "@/db/schema/ar-invoices";
import { businessPartnerAddresses } from "@/db/schema/business-partner-addresses";
import { businessPartners } from "@/db/schema/business-partners";
import { goodsIssueLines } from "@/db/schema/goods-issue-lines";
import { goodsIssues } from "@/db/schema/goods-issues";
import { goodsReceiptLines } from "@/db/schema/goods-receipt-lines";
import { goodsReceipts } from "@/db/schema/goods-receipts";
import { grpo } from "@/db/schema/grpo";
import { grpoLines } from "@/db/schema/grpo-lines";
import { incomingPayments } from "@/db/schema/incoming-payments";
import { inventoryTransferLines } from "@/db/schema/inventory-transfer-lines";
import { inventoryTransferRequestLines } from "@/db/schema/inventory-transfer-request-lines";
import { inventoryTransferRequests } from "@/db/schema/inventory-transfer-requests";
import { inventoryTransfers } from "@/db/schema/inventory-transfers";
import { itemPrices } from "@/db/schema/item-prices";
import { itemWarehouseStock } from "@/db/schema/item-warehouse-stock";
import { items } from "@/db/schema/items";
import { outgoingPayments } from "@/db/schema/outgoing-payments";
import { priceLists } from "@/db/schema/price-lists";
import { purchaseOrderLines } from "@/db/schema/purchase-order-lines";
import { purchaseOrders } from "@/db/schema/purchase-orders";
import { purchaseQuotationLines } from "@/db/schema/purchase-quotation-lines";
import { purchaseQuotations } from "@/db/schema/purchase-quotations";
import { salesEmployees } from "@/db/schema/sales-employees";
import { salesOrderLines } from "@/db/schema/sales-order-lines";
import { salesOrders } from "@/db/schema/sales-orders";
import { salesQuotationLines } from "@/db/schema/sales-quotation-lines";
import { salesQuotations } from "@/db/schema/sales-quotations";
import { taxGroups } from "@/db/schema/tax-groups";
import { unitOfMeasurements } from "@/db/schema/unit-of-measurements";
import { users } from "@/db/schema/users";
import { warehouses } from "@/db/schema/warehouses";

import { seedTenantDocuments } from "./seed.documents";
import { seedRegistry } from "./seed.registry";
import { seedTenantData } from "./seed.tenant";

export async function runSeed() {
  logger.info("Starting database seed process...");

  const seedCurrency = config.currency.defaultCode;

  // 1. Seed Registry Database
  const seededRegistryUsers = await seedRegistry();

  // 2. Dynamic Seeding of each Tenant Database
  const tenantConfigs = [
    { dbName: "CIBI_ERP_DB", prefix: "MC-", seed: 111 },
    { dbName: "VISHNU_ERP_DB", prefix: "RB-", seed: 222 },
    { dbName: "VISHNU_ERP_BRANCH_DB", prefix: "IA-", seed: 333 },
  ];

  for (const tenant of tenantConfigs) {
    logger.debug({ tenantDbName: tenant.dbName }, "Ensuring tenant database exists");
    await ensureDatabaseExists(tenant.dbName, config.postgres.databaseUrl);

    const connectionUrl = new URL(config.postgres.databaseUrl);
    connectionUrl.pathname = `/${tenant.dbName}`;

    const tenantPool = new postgres.Pool({
      connectionString: connectionUrl.toString(),
    });
    const db = drizzle(tenantPool);

    logger.debug({ tenantDbName: tenant.dbName }, "Running migrations on tenant database");
    await migrate(db, {
      migrationsFolder: "./src/db/migrations",
    });

    logger.debug({ tenantDbName: tenant.dbName }, "Cleaning tenant data");
    faker.seed(tenant.seed);

    // Clean tables
    await db.delete(purchaseOrderLines);
    await db.delete(purchaseOrders);
    await db.delete(purchaseQuotationLines);
    await db.delete(purchaseQuotations);
    await db.delete(grpoLines);
    await db.delete(grpo);
    await db.delete(apInvoiceLines);
    await db.delete(apInvoices);
    await db.delete(apCreditMemoLines);
    await db.delete(apCreditMemos);

    await db.delete(salesOrderLines);
    await db.delete(salesOrders);
    await db.delete(salesQuotationLines);
    await db.delete(salesQuotations);
    await db.delete(arInvoiceLines);
    await db.delete(arInvoices);
    await db.delete(arCreditMemoLines);
    await db.delete(arCreditMemos);

    await db.delete(goodsReceiptLines);
    await db.delete(goodsReceipts);
    await db.delete(goodsIssueLines);
    await db.delete(goodsIssues);
    await db.delete(inventoryTransferLines);
    await db.delete(inventoryTransfers);
    await db.delete(inventoryTransferRequestLines);
    await db.delete(inventoryTransferRequests);

    await db.delete(incomingPayments);
    await db.delete(outgoingPayments);

    await db.delete(itemPrices);
    await db.delete(itemWarehouseStock);
    await db.delete(items);
    await db.delete(businessPartners);
    await db.delete(businessPartnerAddresses);
    await db.delete(salesEmployees);
    await db.delete(taxGroups);
    await db.delete(warehouses);
    await db.delete(unitOfMeasurements);
    await db.delete(priceLists);
    await db.delete(adminSettings);
    await db.delete(users);

    logger.debug({ tenantDbName: tenant.dbName }, "Seeding tenant reference data");
    const referenceData = await seedTenantData(db, tenant, seedCurrency, seededRegistryUsers);

    logger.debug({ tenantDbName: tenant.dbName }, "Seeding tenant documents");
    await seedTenantDocuments(db, tenant, seedCurrency, referenceData);

    logger.info({ tenantDbName: tenant.dbName }, "Finished seeding tenant database");
    await tenantPool.end();
  }

  logger.info("All dynamic tenant databases migrated and seeded successfully.");
}
