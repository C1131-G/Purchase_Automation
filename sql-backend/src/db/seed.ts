import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";
import { faker } from "@faker-js/faker";

// Registry schemas
import { users } from "@/db/schema/users";
import { organizations } from "@/db/schema/organizations";
import { userDbAccess } from "@/db/schema/user-db-access";

// Tenant schemas
import { warehouses } from "@/db/schema/warehouses";
import { unitOfMeasurements } from "@/db/schema/unit-of-measurements";
import { priceLists } from "@/db/schema/price-lists";
import { itemPrices } from "@/db/schema/item-prices";
import { itemWarehouseStock } from "@/db/schema/item-warehouse-stock";
import { items } from "@/db/schema/items";
import { businessPartners } from "@/db/schema/business-partners";
import { businessPartnerAddresses } from "@/db/schema/business-partner-addresses";
import { salesEmployees } from "@/db/schema/sales-employees";
import { taxGroups } from "@/db/schema/tax-groups";

import { purchaseOrders } from "@/db/schema/purchase-orders";
import { purchaseOrderLines } from "@/db/schema/purchase-order-lines";
import { purchaseQuotations } from "@/db/schema/purchase-quotations";
import { purchaseQuotationLines } from "@/db/schema/purchase-quotation-lines";
import { grpo } from "@/db/schema/grpo";
import { grpoLines } from "@/db/schema/grpo-lines";
import { apInvoices } from "@/db/schema/ap-invoices";
import { apInvoiceLines } from "@/db/schema/ap-invoice-lines";
import { apCreditMemos } from "@/db/schema/ap-credit-memos";
import { apCreditMemoLines } from "@/db/schema/ap-credit-memo-lines";

import { salesOrders } from "@/db/schema/sales-orders";
import { salesOrderLines } from "@/db/schema/sales-order-lines";
import { salesQuotations } from "@/db/schema/sales-quotations";
import { salesQuotationLines } from "@/db/schema/sales-quotation-lines";
import { arInvoices } from "@/db/schema/ar-invoices";
import { arInvoiceLines } from "@/db/schema/ar-invoice-lines";
import { arCreditMemos } from "@/db/schema/ar-credit-memos";
import { arCreditMemoLines } from "@/db/schema/ar-credit-memo-lines";

import { goodsReceipts } from "@/db/schema/goods-receipts";
import { goodsReceiptLines } from "@/db/schema/goods-receipt-lines";
import { goodsIssues } from "@/db/schema/goods-issues";
import { goodsIssueLines } from "@/db/schema/goods-issue-lines";
import { inventoryTransfers } from "@/db/schema/inventory-transfers";
import { inventoryTransferLines } from "@/db/schema/inventory-transfer-lines";
import { inventoryTransferRequests } from "@/db/schema/inventory-transfer-requests";
import { inventoryTransferRequestLines } from "@/db/schema/inventory-transfer-request-lines";

import { incomingPayments } from "@/db/schema/incoming-payments";
import { outgoingPayments } from "@/db/schema/outgoing-payments";

import { ensureDatabaseExists } from "@/db/client";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { adminSettings } from "@/db/schema/admin-settings";

// Helper to format date for database storage
const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

async function runSeed() {
  logger.info("Starting database seed process...");

  // Seed currency — reads from DEFAULT_CURRENCY_CODE env (no hardcoded value)
  const seedCurrency = config.currency.defaultCode;

  // 1. Connect to the registry database
  const registryPool = new pg.Pool({
    connectionString: config.postgres.databaseUrl,
  });
  const registryDb = drizzle(registryPool);

  // 2. Clear existing registry tables
  logger.info("Cleaning registry tables...");
  await registryDb.delete(userDbAccess);
  await registryDb.delete(organizations);
  await registryDb.delete(users);

  // 3. Seed Organizations
  logger.info("Seeding organizations...");
  const seededOrgs = await registryDb
    .insert(organizations)
    .values([
      {
        companyName: "CIBI ERP Corporate HQ",
        dbName: "CIBI_ERP_DB",
        dbServer: "localhost",
        isActive: "Y",
      },
      {
        companyName: "VISHNU ERP Corporate HQ",
        dbName: "VISHNU_ERP_DB",
        dbServer: "localhost",
        isActive: "Y",
      },
      {
        companyName: "VISHNU ERP Corporate HQ",
        dbName: "VISHNU_ERP_BRANCH_DB",
        dbServer: "localhost",
        isActive: "Y",
      },
    ])
    .returning();

  logger.info({ count: seededOrgs.length }, "Seeded organizations in registry");

  // 4. Seed Users
  logger.info("Seeding users in registry...");
  const seededUsers = await registryDb
    .insert(users)
    .values([
      {
        username: "Cibi",
        password: "admin@123",
        companyName: "CIBI ERP Corporate HQ",
      },
      {
        username: "Chandru",
        password: "admin@123",
        companyName: "CIBI ERP Corporate HQ",
      },
      {
        username: "Vishnu",
        password: "admin123",
        companyName: "VISHNU ERP Corporate HQ",
      },
      {
        username: "Veera",
        password: "employee123",
        companyName: "VISHNU ERP Corporate HQ",
      },
    ])
    .returning();

  logger.info({ count: seededUsers.length }, "Seeded users in registry");

  const userMap = new Map(seededUsers.map((u) => [u.username, u.id]));

  // 5. Seed User-DB Access mapping
  logger.info("Seeding user DB access records in registry...");
  await registryDb.insert(userDbAccess).values([
    { userId: userMap.get("Cibi")!, dbName: "CIBI_ERP_DB" },
    { userId: userMap.get("Chandru")!, dbName: "CIBI_ERP_DB" },

    { userId: userMap.get("Vishnu")!, dbName: "VISHNU_ERP_DB" },
    { userId: userMap.get("Vishnu")!, dbName: "VISHNU_ERP_BRANCH_DB" },

    { userId: userMap.get("Veera")!, dbName: "VISHNU_ERP_BRANCH_DB" },
  ]);

  logger.info("Registry database seeding completed.");
  await registryPool.end();

  // 6. Dynamic Seeding of each Tenant Database
  const tenantConfigs = [
    { dbName: "CIBI_ERP_DB", seed: 111, prefix: "MC-" },
    { dbName: "VISHNU_ERP_DB", seed: 222, prefix: "RB-" },
    { dbName: "VISHNU_ERP_BRANCH_DB", seed: 333, prefix: "IA-" },
  ];

  for (const tenant of tenantConfigs) {
    logger.info({ tenantDbName: tenant.dbName }, "Checking if tenant database exists...");
    await ensureDatabaseExists(tenant.dbName, config.postgres.databaseUrl);

    const connectionUrl = new URL(config.postgres.databaseUrl);
    connectionUrl.pathname = `/${tenant.dbName}`;

    const tenantPool = new pg.Pool({
      connectionString: connectionUrl.toString(),
    });
    const db = drizzle(tenantPool);

    logger.info({ tenantDbName: tenant.dbName }, "Running migrations on tenant database...");
    await migrate(db, {
      migrationsFolder: "./src/db/migrations",
    });

    // 7. Seed Tenant Data
    logger.info({ tenantDbName: tenant.dbName }, "Seeding tenant data...");

    // Set seed for reproducibility
    faker.seed(tenant.seed);

    // A. Clean up all tenant tables in correct order
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

    // Seed admin settings (MainCurncy — used by getDisplayCurrency())
    await db.insert(adminSettings).values({ code: "MainCurncy", value: seedCurrency });

    // B. Seed Tenant Users
    // Only insert users who are allowed to access this tenant database (active users)
    const allowedUsernames: string[] = [];
    if (tenant.dbName === "ERP_MAIN") {
      allowedUsernames.push(
        "main_user_1",
        "main_user_2",
        "multi_db_user",
        "shared_admin",
        "no_access_user",
      );
    } else if (tenant.dbName === "ERP_BRANCH") {
      allowedUsernames.push("multi_db_user", "shared_admin", "no_access_user");
    } else if (tenant.dbName === "ERP_INACTIVE") {
      allowedUsernames.push("user_inactive_db");
    }

    const tenantUsersToInsert = seededUsers
      .filter((u) => allowedUsernames.includes(u.username))
      .map((u) => ({
        id: u.id, // Keep the same ID as the registry
        username: u.username,
        password: u.password,
        companyName: u.companyName,
      }));

    if (tenantUsersToInsert.length > 0) {
      await db.insert(users).values(tenantUsersToInsert);
    }

    // C. Seed Warehouses
    const whValues = [
      {
        code: `${tenant.prefix}WH-01`,
        name: "Main Warehouse",
        inactive: false,
      },
      {
        code: `${tenant.prefix}WH-02`,
        name: "Shipping Warehouse",
        inactive: false,
      },
      {
        code: `${tenant.prefix}WH-03`,
        name: "Returns Warehouse",
        inactive: false,
      },
    ];
    await db.insert(warehouses).values(whValues);

    // D. Seed UOMs
    const uomValues = [
      { code: "Each", entry: 1, name: "Each" },
      { code: "Box", entry: 2, name: "Box" },
      { code: "Pack", entry: 3, name: "Pack" },
      { code: "Carton", entry: 4, name: "Carton" },
    ];
    await db.insert(unitOfMeasurements).values(uomValues);

    // E. Seed Price Lists
    const plValues = [
      { listNum: 1, listName: "Base Price List" },
      { listNum: 2, listName: "Purchase Price List" },
    ];
    await db.insert(priceLists).values(plValues);

    // Seed Sales Employees
    const seValues = [
      { code: 1, name: "Sales Employee 1", active: true },
      { code: 2, name: "Sales Employee 2", active: true },
      { code: 3, name: "Buyer Employee 1", active: true },
      { code: 4, name: "Buyer Employee 2", active: true },
    ];
    await db.insert(salesEmployees).values(seValues);

    // Seed Tax Groups
    const tgValues = [
      { code: "O1", name: "Output Tax 18%", rate: "18.00", inactive: false },
      { code: "O2", name: "Output Tax 12%", rate: "12.00", inactive: false },
      { code: "I1", name: "Input Tax 18%", rate: "18.00", inactive: false },
      { code: "I2", name: "Input Tax 12%", rate: "12.00", inactive: false },
    ];
    await db.insert(taxGroups).values(tgValues);

    // F. Seed Business Partners (Customers & Vendors)
    const bpValues: any[] = [];
    const addressValues: any[] = [];
    // 10 Vendors
    for (let i = 1; i <= 10; i++) {
      const code = `${tenant.prefix}V-${String(i).padStart(3, "0")}`;
      const name = `${faker.company.name()} Vendor`;
      const billToDef = "Billing Default";
      const shipToDef = "Shipping Default";

      const billToAddrText1 = faker.location.streetAddress(true);
      const billToAddrText2 = faker.location.streetAddress(true);
      const shipToAddrText1 = faker.location.streetAddress(true);
      const shipToAddrText2 = faker.location.streetAddress(true);

      bpValues.push({
        code,
        name,
        type: "S",
        currency: "USD",
        phone: faker.phone.number(),
        email: faker.internet.email(),
        billToAddress: billToAddrText1,
        shipToAddress: shipToAddrText1,
        billToDef,
        shipToDef,
        salesEmployeeCode: i % 2 === 0 ? 3 : 4,
        frozen: false,
      });

      addressValues.push({
        cardCode: code,
        addressType: "B",
        address: "Billing Default",
        street: billToAddrText1,
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: faker.location.countryCode(),
      });
      addressValues.push({
        cardCode: code,
        addressType: "B",
        address: "Billing Secondary",
        street: billToAddrText2,
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: faker.location.countryCode(),
      });
      addressValues.push({
        cardCode: code,
        addressType: "S",
        address: "Shipping Default",
        street: shipToAddrText1,
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: faker.location.countryCode(),
      });
      addressValues.push({
        cardCode: code,
        addressType: "S",
        address: "Shipping Secondary",
        street: shipToAddrText2,
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: faker.location.countryCode(),
      });
    }
    // 10 Customers
    for (let i = 1; i <= 10; i++) {
      const code = `${tenant.prefix}C-${String(i).padStart(3, "0")}`;
      const name = `${faker.company.name()} Customer`;
      const billToDef = "Billing Default";
      const shipToDef = "Shipping Default";

      const billToAddrText1 = faker.location.streetAddress(true);
      const billToAddrText2 = faker.location.streetAddress(true);
      const shipToAddrText1 = faker.location.streetAddress(true);
      const shipToAddrText2 = faker.location.streetAddress(true);

      bpValues.push({
        code,
        name,
        type: "C",
        currency: "USD",
        phone: faker.phone.number(),
        email: faker.internet.email(),
        billToAddress: billToAddrText1,
        shipToAddress: shipToAddrText1,
        billToDef,
        shipToDef,
        salesEmployeeCode: i % 2 === 0 ? 1 : 2,
        frozen: false,
      });

      addressValues.push({
        cardCode: code,
        addressType: "B",
        address: "Billing Default",
        street: billToAddrText1,
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: faker.location.countryCode(),
      });
      addressValues.push({
        cardCode: code,
        addressType: "B",
        address: "Billing Secondary",
        street: billToAddrText2,
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: faker.location.countryCode(),
      });
      addressValues.push({
        cardCode: code,
        addressType: "S",
        address: "Shipping Default",
        street: shipToAddrText1,
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: faker.location.countryCode(),
      });
      addressValues.push({
        cardCode: code,
        addressType: "S",
        address: "Shipping Secondary",
        street: shipToAddrText2,
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: faker.location.countryCode(),
      });
    }
    await db.insert(businessPartners).values(bpValues);
    if (addressValues.length > 0) {
      await db.insert(businessPartnerAddresses).values(addressValues);
    }

    const bpVendors = bpValues.filter((bp) => bp.type === "S");
    const bpCustomers = bpValues.filter((bp) => bp.type === "C");

    // G. Seed Items, Prices and Stock
    const itemValues: any[] = [];
    const ipValues: any[] = [];
    const stockValues: any[] = [];

    for (let i = 1; i <= 30; i++) {
      const code = `${tenant.prefix}ITEM-${String(i).padStart(3, "0")}`;
      const name = faker.commerce.productName();
      const avgPrice = parseFloat(faker.commerce.price({ min: 10, max: 200 }));
      const lastPrice = parseFloat((avgPrice * 0.95).toFixed(2));

      itemValues.push({
        code,
        name,
        foreignName: faker.commerce.productMaterial(),
        itemGroupCode: faker.number.int({ min: 100, max: 105 }),
        inventoryUom: "Each",
        purchaseItem: true,
        salesItem: true,
        inventoryItem: true,
        defaultWarehouse: `${tenant.prefix}WH-01`,
        avgPrice: avgPrice.toString(),
        lastPurchasePrice: lastPrice.toString(),
        lastPurchaseDate: formatDate(faker.date.past({ years: 1 })),
        barcode: faker.commerce.isbn(),
        frozen: false,
      });

      // Price List mappings
      ipValues.push(
        { itemCode: code, priceList: 1, price: (avgPrice * 1.2).toFixed(2) }, // Base Price List
        { itemCode: code, priceList: 2, price: lastPrice.toFixed(2) }, // Purchase Price List
      );

      // Stock mappings
      // Ensure at least two items have low stock (<= 10) for testing low-stock exceptions
      const stockQty1 =
        i <= 2 ? faker.number.int({ min: 1, max: 9 }) : faker.number.int({ min: 15, max: 500 });
      const stockQty2 = faker.number.int({ min: 0, max: 150 });
      const stockQty3 = faker.number.int({ min: 0, max: 50 });

      stockValues.push(
        {
          itemCode: code,
          warehouseCode: `${tenant.prefix}WH-01`,
          onHand: stockQty1.toString(),
        },
        {
          itemCode: code,
          warehouseCode: `${tenant.prefix}WH-02`,
          onHand: stockQty2.toString(),
        },
        {
          itemCode: code,
          warehouseCode: `${tenant.prefix}WH-03`,
          onHand: stockQty3.toString(),
        },
      );
    }
    await db.insert(items).values(itemValues);
    await db.insert(itemPrices).values(ipValues);
    await db.insert(itemWarehouseStock).values(stockValues);

    // Helper to get random items
    const getRandomItems = (count: number) => {
      const shuffled = [...itemValues].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    };

    // H. Document Seeding Helper
    // Spreads documents evenly over the last 365 days relative to now
    const getDocDate = (index: number, total: number) => {
      const daysAgo = Math.floor((index / total) * 365);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      return date;
    };

    // --- PURCHASE DOCUMENTS ---

    // 1. Purchase Quotations (100 rows)
    const pqHeaders: any[] = [];
    const pqLinesSpec: any[] = [];
    for (let i = 1; i <= 100; i++) {
      const bp = bpVendors[i % bpVendors.length];
      const docDate = getDocDate(i, 100);
      const selectedItems = getRandomItems(2);

      let docTotal = 0;
      const lineItems: any[] = [];
      selectedItems.forEach((item) => {
        const qty = faker.number.int({ min: 1, max: 20 });
        const price = parseFloat(item.lastPurchasePrice);
        docTotal += qty * price;
        lineItems.push({ item, qty, price });
      });

      pqHeaders.push({
        docNum: 10000 + i,
        docDate: formatDate(docDate),
        docDueDate: formatDate(new Date(docDate.getTime() + 14 * 24 * 60 * 60 * 1000)),
        cardCode: bp.code,
        cardName: bp.name,
        docCurrency: seedCurrency,
        docStatus: i % 2 === 0 ? "O" : "C",
        address: bp.billToAddress,
        comments: `Seeded purchase quotation ${i}`,
        docTotal: docTotal.toString(),
      });
      pqLinesSpec.push(lineItems);
    }
    const seededPQs = await db.insert(purchaseQuotations).values(pqHeaders).returning();
    const pqLinesToInsert: any[] = [];
    seededPQs.forEach((pq, index) => {
      const specs = pqLinesSpec[index];
      specs.forEach((spec, lineIndex) => {
        pqLinesToInsert.push({
          docEntry: pq.id,
          lineNum: lineIndex,
          itemCode: spec.item.code,
          itemDescription: spec.item.name,
          quantity: spec.qty.toString(),
          unitPrice: spec.price.toString(),
          lineTotal: (spec.qty * spec.price).toString(),
          warehouseCode: `${tenant.prefix}WH-01`,
          uomCode: "Each",
          uomEntry: 1,
        });
      });
    });
    if (pqLinesToInsert.length > 0) {
      await db.insert(purchaseQuotationLines).values(pqLinesToInsert);
    }

    // 2. Purchase Orders (150 rows)
    const poHeaders: any[] = [];
    const poLinesSpec: any[] = [];
    for (let i = 1; i <= 150; i++) {
      const bp = bpVendors[i % bpVendors.length];
      const docDate = getDocDate(i, 150);
      const selectedItems = getRandomItems(2);

      let docTotal = 0;
      const lineItems: any[] = [];
      selectedItems.forEach((item) => {
        const qty = faker.number.int({ min: 1, max: 20 });
        const price = parseFloat(item.lastPurchasePrice);
        docTotal += qty * price;
        lineItems.push({ item, qty, price });
      });

      poHeaders.push({
        docNum: 10000 + i,
        docDate: formatDate(docDate),
        docDueDate: formatDate(new Date(docDate.getTime() + 14 * 24 * 60 * 60 * 1000)),
        cardCode: bp.code,
        cardName: bp.name,
        docCurrency: seedCurrency,
        docStatus: i % 15 === 0 ? "D" : i % 20 === 0 ? "C" : "O",
        address: bp.billToAddress,
        comments: `Seeded purchase order ${i}`,
        docTotal: docTotal.toString(),
      });
      poLinesSpec.push(lineItems);
    }
    const seededPOs = await db.insert(purchaseOrders).values(poHeaders).returning();
    const poEntries = seededPOs.map((po) => po.id);
    const poLinesToInsert: any[] = [];
    seededPOs.forEach((po, index) => {
      const specs = poLinesSpec[index];
      specs.forEach((spec, lineIndex) => {
        poLinesToInsert.push({
          docEntry: po.id,
          lineNum: lineIndex,
          itemCode: spec.item.code,
          itemDescription: spec.item.name,
          quantity: spec.qty.toString(),
          unitPrice: spec.price.toString(),
          lineTotal: (spec.qty * spec.price).toString(),
          warehouseCode: `${tenant.prefix}WH-01`,
          uomCode: "Each",
          uomEntry: 1,
        });
      });
    });
    if (poLinesToInsert.length > 0) {
      await db.insert(purchaseOrderLines).values(poLinesToInsert);
    }

    // 3. GRPOs (100 rows)
    const grpoHeaders: any[] = [];
    const grpoLinesSpec: any[] = [];
    for (let i = 1; i <= 100; i++) {
      const bp = bpVendors[i % bpVendors.length];
      const docDate = getDocDate(i, 100);
      const selectedItems = getRandomItems(2);

      let docTotal = 0;
      const lineItems: any[] = [];
      selectedItems.forEach((item) => {
        const qty = faker.number.int({ min: 1, max: 20 });
        const price = parseFloat(item.lastPurchasePrice);
        docTotal += qty * price;
        lineItems.push({ item, qty, price });
      });

      grpoHeaders.push({
        docNum: 10000 + i,
        docDate: formatDate(docDate),
        docDueDate: formatDate(new Date(docDate.getTime() + 14 * 24 * 60 * 60 * 1000)),
        cardCode: bp.code,
        cardName: bp.name,
        docCurrency: seedCurrency,
        docStatus: "O",
        address: bp.billToAddress,
        comments: `Seeded GRPO ${i}`,
        docTotal: docTotal.toString(),
      });
      grpoLinesSpec.push(lineItems);
    }
    const seededGRPOs = await db.insert(grpo).values(grpoHeaders).returning();
    const grpoLinesToInsert: any[] = [];
    seededGRPOs.forEach((gr, index) => {
      const specs = grpoLinesSpec[index];
      specs.forEach((spec, lineIndex) => {
        grpoLinesToInsert.push({
          docEntry: gr.id,
          lineNum: lineIndex,
          itemCode: spec.item.code,
          itemDescription: spec.item.name,
          quantity: spec.qty.toString(),
          unitPrice: spec.price.toString(),
          lineTotal: (spec.qty * spec.price).toString(),
          warehouseCode: `${tenant.prefix}WH-01`,
          uomCode: "Each",
          uomEntry: 1,
          baseType: 22,
          baseEntry: poEntries[index % poEntries.length],
          baseLine: lineIndex,
        });
      });
    });
    if (grpoLinesToInsert.length > 0) {
      await db.insert(grpoLines).values(grpoLinesToInsert);
    }

    // 4. AP Invoices (120 rows)
    const apInvoiceHeaders: any[] = [];
    const apInvoiceLinesSpec: any[] = [];
    for (let i = 1; i <= 120; i++) {
      const bp = bpVendors[i % bpVendors.length];
      const docDate = getDocDate(i, 120);
      const selectedItems = getRandomItems(2);

      let docTotal = 0;
      const lineItems: any[] = [];
      selectedItems.forEach((item) => {
        const qty = faker.number.int({ min: 1, max: 20 });
        const price = parseFloat(item.lastPurchasePrice);
        docTotal += qty * price;
        lineItems.push({ item, qty, price });
      });

      apInvoiceHeaders.push({
        docNum: 10000 + i,
        docDate: formatDate(docDate),
        docDueDate: formatDate(new Date(docDate.getTime() + 30 * 24 * 60 * 60 * 1000)),
        cardCode: bp.code,
        cardName: bp.name,
        docCurrency: seedCurrency,
        docStatus: i % 2 === 0 ? "C" : "O",
        paidToDate: (i % 2 === 0 ? docTotal : 0).toString(),
        address: bp.billToAddress,
        docTotal: docTotal.toString(),
      });
      apInvoiceLinesSpec.push(lineItems);
    }
    const seededAPInvoices = await db.insert(apInvoices).values(apInvoiceHeaders).returning();
    const apInvoiceEntries = seededAPInvoices.map((ap) => ({
      id: ap.id,
      total: parseFloat(ap.docTotal || "0"),
    }));
    const apLinesToInsert: any[] = [];
    seededAPInvoices.forEach((ap, index) => {
      const specs = apInvoiceLinesSpec[index];
      specs.forEach((spec, lineIndex) => {
        apLinesToInsert.push({
          docEntry: ap.id,
          lineNum: lineIndex,
          itemCode: spec.item.code,
          itemDescription: spec.item.name,
          quantity: spec.qty.toString(),
          unitPrice: spec.price.toString(),
          lineTotal: (spec.qty * spec.price).toString(),
          warehouseCode: `${tenant.prefix}WH-01`,
          uomCode: "Each",
          uomEntry: 1,
        });
      });
    });
    if (apLinesToInsert.length > 0) {
      await db.insert(apInvoiceLines).values(apLinesToInsert);
    }

    // 5. AP Credit Memos (50 rows)
    const apCMHeaders: any[] = [];
    const apCMLinesSpec: any[] = [];
    for (let i = 1; i <= 50; i++) {
      const bp = bpVendors[i % bpVendors.length];
      const docDate = getDocDate(i, 50);
      const selectedItems = getRandomItems(1);

      let docTotal = 0;
      const lineItems: any[] = [];
      selectedItems.forEach((item) => {
        const qty = faker.number.int({ min: 1, max: 5 });
        const price = parseFloat(item.lastPurchasePrice);
        docTotal += qty * price;
        lineItems.push({ item, qty, price });
      });

      apCMHeaders.push({
        docNum: 10000 + i,
        docDate: formatDate(docDate),
        docDueDate: formatDate(docDate),
        cardCode: bp.code,
        cardName: bp.name,
        docCurrency: seedCurrency,
        docStatus: "C",
        address: bp.billToAddress,
        comments: `Seeded credit memo ${i}`,
        docTotal: docTotal.toString(),
      });
      apCMLinesSpec.push(lineItems);
    }
    const seededAPCMs = await db.insert(apCreditMemos).values(apCMHeaders).returning();
    const apCMLinesToInsert: any[] = [];
    seededAPCMs.forEach((cm, index) => {
      const specs = apCMLinesSpec[index];
      specs.forEach((spec, lineIndex) => {
        apCMLinesToInsert.push({
          docEntry: cm.id,
          lineNum: lineIndex,
          itemCode: spec.item.code,
          itemDescription: spec.item.name,
          quantity: spec.qty.toString(),
          unitPrice: spec.price.toString(),
          lineTotal: (spec.qty * spec.price).toString(),
          warehouseCode: `${tenant.prefix}WH-01`,
          uomCode: "Each",
          uomEntry: 1,
        });
      });
    });
    if (apCMLinesToInsert.length > 0) {
      await db.insert(apCreditMemoLines).values(apCMLinesToInsert);
    }

    // --- SALES DOCUMENTS ---

    // 6. Sales Quotations (80 rows)
    const sqHeaders: any[] = [];
    const sqLinesSpec: any[] = [];
    for (let i = 1; i <= 80; i++) {
      const bp = bpCustomers[i % bpCustomers.length];
      const docDate = getDocDate(i, 80);
      const selectedItems = getRandomItems(2);

      let docTotal = 0;
      const lineItems: any[] = [];
      selectedItems.forEach((item) => {
        const qty = faker.number.int({ min: 1, max: 20 });
        const price = parseFloat(item.avgPrice);
        docTotal += qty * price;
        lineItems.push({ item, qty, price });
      });

      sqHeaders.push({
        docNum: 20000 + i,
        docDate: formatDate(docDate),
        docDueDate: formatDate(new Date(docDate.getTime() + 14 * 24 * 60 * 60 * 1000)),
        cardCode: bp.code,
        cardName: bp.name,
        docCurrency: seedCurrency,
        docStatus: "O",
        address: bp.billToAddress,
        docTotal: docTotal.toString(),
      });
      sqLinesSpec.push(lineItems);
    }
    const seededSQs = await db.insert(salesQuotations).values(sqHeaders).returning();
    const sqLinesToInsert: any[] = [];
    seededSQs.forEach((sq, index) => {
      const specs = sqLinesSpec[index];
      specs.forEach((spec, lineIndex) => {
        sqLinesToInsert.push({
          docEntry: sq.id,
          lineNum: lineIndex,
          itemCode: spec.item.code,
          itemDescription: spec.item.name,
          quantity: spec.qty.toString(),
          unitPrice: spec.price.toString(),
          lineTotal: (spec.qty * spec.price).toString(),
          warehouseCode: `${tenant.prefix}WH-01`,
          uomCode: "Each",
          uomEntry: 1,
        });
      });
    });
    if (sqLinesToInsert.length > 0) {
      await db.insert(salesQuotationLines).values(sqLinesToInsert);
    }

    // 7. Sales Orders (120 rows)
    const soHeaders: any[] = [];
    const soLinesSpec: any[] = [];
    for (let i = 1; i <= 120; i++) {
      const bp = bpCustomers[i % bpCustomers.length];
      const docDate = getDocDate(i, 120);
      const selectedItems = getRandomItems(2);

      let docTotal = 0;
      const lineItems: any[] = [];
      selectedItems.forEach((item) => {
        const qty = faker.number.int({ min: 1, max: 20 });
        const price = parseFloat(item.avgPrice);
        docTotal += qty * price;
        lineItems.push({ item, qty, price });
      });

      soHeaders.push({
        docNum: 20000 + i,
        docDate: formatDate(docDate),
        docDueDate: formatDate(new Date(docDate.getTime() + 14 * 24 * 60 * 60 * 1000)),
        cardCode: bp.code,
        cardName: bp.name,
        docCurrency: seedCurrency,
        docStatus: i % 15 === 0 ? "D" : i % 20 === 0 ? "C" : "O",
        address: bp.billToAddress,
        docTotal: docTotal.toString(),
      });
      soLinesSpec.push(lineItems);
    }
    const seededSOs = await db.insert(salesOrders).values(soHeaders).returning();
    const soLinesToInsert: any[] = [];
    seededSOs.forEach((so, index) => {
      const specs = soLinesSpec[index];
      specs.forEach((spec, lineIndex) => {
        soLinesToInsert.push({
          docEntry: so.id,
          lineNum: lineIndex,
          itemCode: spec.item.code,
          itemDescription: spec.item.name,
          quantity: spec.qty.toString(),
          unitPrice: spec.price.toString(),
          lineTotal: (spec.qty * spec.price).toString(),
          warehouseCode: `${tenant.prefix}WH-01`,
          uomCode: "Each",
          uomEntry: 1,
        });
      });
    });
    if (soLinesToInsert.length > 0) {
      await db.insert(salesOrderLines).values(soLinesToInsert);
    }

    // 8. AR Invoices (100 rows)
    const arInvoiceHeaders: any[] = [];
    const arInvoiceLinesSpec: any[] = [];
    for (let i = 1; i <= 100; i++) {
      const bp = bpCustomers[i % bpCustomers.length];
      const docDate = getDocDate(i, 100);
      const selectedItems = getRandomItems(2);

      let docTotal = 0;
      const lineItems: any[] = [];
      selectedItems.forEach((item) => {
        const qty = faker.number.int({ min: 1, max: 20 });
        const price = parseFloat(item.avgPrice);
        docTotal += qty * price;
        lineItems.push({ item, qty, price });
      });

      arInvoiceHeaders.push({
        docNum: 20000 + i,
        docDate: formatDate(docDate),
        docDueDate: formatDate(new Date(docDate.getTime() + 30 * 24 * 60 * 60 * 1000)),
        cardCode: bp.code,
        cardName: bp.name,
        docCurrency: seedCurrency,
        docStatus: i % 2 === 0 ? "C" : "O",
        paidToDate: (i % 2 === 0 ? docTotal : 0).toString(),
        address: bp.billToAddress,
        docTotal: docTotal.toString(),
      });
      arInvoiceLinesSpec.push(lineItems);
    }
    const seededARInvoices = await db.insert(arInvoices).values(arInvoiceHeaders).returning();
    const arInvoiceEntries = seededARInvoices.map((ar) => ({
      id: ar.id,
      total: parseFloat(ar.docTotal || "0"),
    }));
    const arLinesToInsert: any[] = [];
    seededARInvoices.forEach((ar, index) => {
      const specs = arInvoiceLinesSpec[index];
      specs.forEach((spec, lineIndex) => {
        arLinesToInsert.push({
          docEntry: ar.id,
          lineNum: lineIndex,
          itemCode: spec.item.code,
          itemDescription: spec.item.name,
          quantity: spec.qty.toString(),
          unitPrice: spec.price.toString(),
          lineTotal: (spec.qty * spec.price).toString(),
          warehouseCode: `${tenant.prefix}WH-01`,
          uomCode: "Each",
          uomEntry: 1,
        });
      });
    });
    if (arLinesToInsert.length > 0) {
      await db.insert(arInvoiceLines).values(arLinesToInsert);
    }

    // 9. AR Credit Memos (40 rows)
    const arCMHeaders: any[] = [];
    const arCMLinesSpec: any[] = [];
    for (let i = 1; i <= 40; i++) {
      const bp = bpCustomers[i % bpCustomers.length];
      const docDate = getDocDate(i, 40);
      const selectedItems = getRandomItems(1);

      let docTotal = 0;
      const lineItems: any[] = [];
      selectedItems.forEach((item) => {
        const qty = faker.number.int({ min: 1, max: 5 });
        const price = parseFloat(item.avgPrice);
        docTotal += qty * price;
        lineItems.push({ item, qty, price });
      });

      arCMHeaders.push({
        docNum: 20000 + i,
        docDate: formatDate(docDate),
        docDueDate: formatDate(docDate),
        cardCode: bp.code,
        cardName: bp.name,
        docCurrency: seedCurrency,
        docStatus: "C",
        address: bp.billToAddress,
        docTotal: docTotal.toString(),
      });
      arCMLinesSpec.push(lineItems);
    }
    const seededARCMs = await db.insert(arCreditMemos).values(arCMHeaders).returning();
    const arCMLinesToInsert: any[] = [];
    seededARCMs.forEach((cm, index) => {
      const specs = arCMLinesSpec[index];
      specs.forEach((spec, lineIndex) => {
        arCMLinesToInsert.push({
          docEntry: cm.id,
          lineNum: lineIndex,
          itemCode: spec.item.code,
          itemDescription: spec.item.name,
          quantity: spec.qty.toString(),
          unitPrice: spec.price.toString(),
          lineTotal: (spec.qty * spec.price).toString(),
          warehouseCode: `${tenant.prefix}WH-01`,
          uomCode: "Each",
          uomEntry: 1,
        });
      });
    });
    if (arCMLinesToInsert.length > 0) {
      await db.insert(arCreditMemoLines).values(arCMLinesToInsert);
    }

    // --- PAYMENTS ---

    // 10. Outgoing Payments (60 rows) - pays AP Invoices
    const opValues: any[] = [];
    for (let i = 1; i <= 60; i++) {
      const bp = bpVendors[i % bpVendors.length];
      const docDate = getDocDate(i, 60);
      const ap = apInvoiceEntries[i % apInvoiceEntries.length];

      opValues.push({
        docNum: 30000 + i,
        docDate: formatDate(docDate),
        cardCode: bp.code,
        cardName: bp.name,
        docTotal: ap.total.toString(),
        docCurrency: seedCurrency,
        paymentMode: "Cash",
      });
    }
    if (opValues.length > 0) {
      await db.insert(outgoingPayments).values(opValues);
    }

    // 11. Incoming Payments (60 rows) - pays AR Invoices
    const ipValuesList: any[] = [];
    for (let i = 1; i <= 60; i++) {
      const bp = bpCustomers[i % bpCustomers.length];
      const docDate = getDocDate(i, 60);
      const ar = arInvoiceEntries[i % arInvoiceEntries.length];

      ipValuesList.push({
        docNum: 40000 + i,
        docDate: formatDate(docDate),
        cardCode: bp.code,
        cardName: bp.name,
        docTotal: ar.total.toString(),
        docCurrency: seedCurrency,
        paymentMode: "Cash",
      });
    }
    if (ipValuesList.length > 0) {
      await db.insert(incomingPayments).values(ipValuesList);
    }

    // --- INVENTORY DOCUMENTS ---

    // 12. Goods Receipts (20 rows)
    const grHeaders: any[] = [];
    const grLinesSpec: any[] = [];
    for (let i = 1; i <= 20; i++) {
      const docDate = getDocDate(i, 20);
      const selectedItems = getRandomItems(2);

      grHeaders.push({
        docNum: 50000 + i,
        docDate: formatDate(docDate),
        comments: `Inventory receipt ${i}`,
      });

      const lineItems: any[] = [];
      selectedItems.forEach((item) => {
        const qty = faker.number.int({ min: 5, max: 50 });
        lineItems.push({ item, qty });
      });
      grLinesSpec.push(lineItems);
    }
    const seededGRs = await db.insert(goodsReceipts).values(grHeaders).returning();
    const grLinesToInsert: any[] = [];
    seededGRs.forEach((gr, index) => {
      const specs = grLinesSpec[index];
      specs.forEach((spec, lineIndex) => {
        grLinesToInsert.push({
          docEntry: gr.id,
          lineNum: lineIndex,
          itemCode: spec.item.code,
          dscription: spec.item.name,
          quantity: spec.qty.toString(),
          warehouseCode: `${tenant.prefix}WH-01`,
          price: spec.item.avgPrice,
        });
      });
    });
    if (grLinesToInsert.length > 0) {
      await db.insert(goodsReceiptLines).values(grLinesToInsert);
    }

    // 13. Goods Issues (20 rows)
    const giHeaders: any[] = [];
    const giLinesSpec: any[] = [];
    for (let i = 1; i <= 20; i++) {
      const docDate = getDocDate(i, 20);
      const selectedItems = getRandomItems(2);

      giHeaders.push({
        docNum: 60000 + i,
        docDate: formatDate(docDate),
        comments: `Inventory issue ${i}`,
      });

      const lineItems: any[] = [];
      selectedItems.forEach((item) => {
        const qty = faker.number.int({ min: 1, max: 10 });
        lineItems.push({ item, qty });
      });
      giLinesSpec.push(lineItems);
    }
    const seededGIs = await db.insert(goodsIssues).values(giHeaders).returning();
    const giLinesToInsert: any[] = [];
    seededGIs.forEach((gi, index) => {
      const specs = giLinesSpec[index];
      specs.forEach((spec, lineIndex) => {
        giLinesToInsert.push({
          docEntry: gi.id,
          lineNum: lineIndex,
          itemCode: spec.item.code,
          dscription: spec.item.name,
          quantity: spec.qty.toString(),
          warehouseCode: `${tenant.prefix}WH-01`,
          price: spec.item.avgPrice,
        });
      });
    });
    if (giLinesToInsert.length > 0) {
      await db.insert(goodsIssueLines).values(giLinesToInsert);
    }

    // 14. Inventory Transfers (20 rows)
    const itHeaders: any[] = [];
    const itLinesSpec: any[] = [];
    for (let i = 1; i <= 20; i++) {
      const docDate = getDocDate(i, 20);
      const selectedItems = getRandomItems(2);

      itHeaders.push({
        docNum: 70000 + i,
        docDate: formatDate(docDate),
        filler: `${tenant.prefix}WH-01`,
        toWarehouseCode: `${tenant.prefix}WH-02`,
        comments: `Stock transfer ${i}`,
      });

      const lineItems: any[] = [];
      selectedItems.forEach((item) => {
        const qty = faker.number.int({ min: 5, max: 20 });
        lineItems.push({ item, qty });
      });
      itLinesSpec.push(lineItems);
    }
    const seededITs = await db.insert(inventoryTransfers).values(itHeaders).returning();
    const itLinesToInsert: any[] = [];
    seededITs.forEach((it, index) => {
      const specs = itLinesSpec[index];
      specs.forEach((spec, lineIndex) => {
        itLinesToInsert.push({
          docEntry: it.id,
          lineNum: lineIndex,
          itemCode: spec.item.code,
          dscription: spec.item.name,
          quantity: spec.qty.toString(),
          fromWarehouseCode: `${tenant.prefix}WH-01`,
          warehouseCode: `${tenant.prefix}WH-02`,
        });
      });
    });
    if (itLinesToInsert.length > 0) {
      await db.insert(inventoryTransferLines).values(itLinesToInsert);
    }

    // 15. Inventory Transfer Requests (20 rows)
    const itrHeaders: any[] = [];
    const itrLinesSpec: any[] = [];
    for (let i = 1; i <= 20; i++) {
      const docDate = getDocDate(i, 20);
      const selectedItems = getRandomItems(2);

      itrHeaders.push({
        docNum: 80000 + i,
        docDate: formatDate(docDate),
        filler: `${tenant.prefix}WH-01`,
        toWarehouseCode: `${tenant.prefix}WH-02`,
        comments: `Request transfer ${i}`,
      });

      const lineItems: any[] = [];
      selectedItems.forEach((item) => {
        const qty = faker.number.int({ min: 5, max: 20 });
        lineItems.push({ item, qty });
      });
      itrLinesSpec.push(lineItems);
    }
    const seededITRs = await db.insert(inventoryTransferRequests).values(itrHeaders).returning();
    const itrLinesToInsert: any[] = [];
    seededITRs.forEach((itr, index) => {
      const specs = itrLinesSpec[index];
      specs.forEach((spec, lineIndex) => {
        itrLinesToInsert.push({
          docEntry: itr.id,
          lineNum: lineIndex,
          itemCode: spec.item.code,
          dscription: spec.item.name,
          quantity: spec.qty.toString(),
          fromWarehouseCode: `${tenant.prefix}WH-01`,
          warehouseCode: `${tenant.prefix}WH-02`,
        });
      });
    });
    if (itrLinesToInsert.length > 0) {
      await db.insert(inventoryTransferRequestLines).values(itrLinesToInsert);
    }

    logger.info({ tenantDbName: tenant.dbName }, "Finished seeding tenant database.");
    await tenantPool.end();
  }

  logger.info("All dynamic tenant databases migrated and seeded successfully.");
  logger.info("Registry and tenant database seeding completed successfully.");
}

runSeed().catch((err) => {
  logger.fatal({ err }, "Registry/Tenant dynamic seeding failed");
  process.exit(1);
});
