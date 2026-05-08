import "reflect-metadata";
import { DataSource } from "typeorm";

import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";
import { AdminSettingsSchema } from "@/db/schemas/admin-settings.schema";
import { APCreditMemoSchema } from "@/db/schemas/ap-credit-memo.schema";
import { APInvoiceSchema } from "@/db/schemas/ap-invoice.schema";
import { APCreditMemoHeaderSchema } from "@/db/schemas/apcreditmemoheader.schema";
import { APInvoiceHeaderSchema } from "@/db/schemas/apinvoiceheader.schema";
import { ARCreditMemoSchema } from "@/db/schemas/ar-credit-memo.schema";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { BusinessPartnerAddressSchema } from "@/db/schemas/business-partner-address.schema";
import { BusinessPartnerSchema } from "@/db/schemas/business-partner.schema";
import { GRPOSchema } from "@/db/schemas/grpo.schema";
import { GRPOHeaderSchema } from "@/db/schemas/grpoheader.schema";
import { IncomingPaymentSchema } from "@/db/schemas/incoming-payment.schema";
import { ItemPriceSchema } from "@/db/schemas/item-price.schema";
import { ItemWarehouseStockSchema } from "@/db/schemas/item-warehouse-stock.schema";
import { ItemSchema } from "@/db/schemas/item.schema";
import { OrganizationSchema } from "@/db/schemas/organization.schema";
import { OutgoingPaymentSchema } from "@/db/schemas/outgoing-payment.schema";
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { SalesEmployeeSchema } from "@/db/schemas/sales-employee.schema";
import { SalesOrderSchema } from "@/db/schemas/sales-order.schema";
import { SalesQuotationSchema } from "@/db/schemas/sales-quotation.schema";
import { TaxGroupSchema } from "@/db/schemas/tax-group.schema";
import { UnitOfMeasurementSchema } from "@/db/schemas/unit-of-measurement.schema";
import { UserSchema } from "@/db/schemas/user.schema";
import { WarehouseSchema } from "@/db/schemas/warehouse.schema";

const tenantDataSources = new Map<string, DataSource>();

export const AppDataSource = new DataSource({
  database: config.sql.commonDb,
  entities: [OrganizationSchema, UserSchema],
  host: config.sql.host,
  logger: "simple-console",
  logging: config.nodeEnv === "development" ? ["error"] : false,
  migrations: ["src/migrations/*.sql"],
  password: config.sql.password,
  port: config.sql.port,
  subscribers: [],
  synchronize: false,
  type: "mssql",
  username: config.sql.username,
});

export const getTenantDataSource = (dbName: string): DataSource => {
  const existing = tenantDataSources.get(dbName);
  if (existing && existing.isInitialized) {
    return existing;
  }

  const tenantDs = new DataSource({
    database: `Tenant_${dbName}`,
    entities: [
      AdminSettingsSchema,
      PurchaseOrderSchema,
      GRPOSchema,
      APInvoiceSchema,
      APCreditMemoSchema,
      OutgoingPaymentSchema,
      UserSchema,
      ItemSchema,
      ItemPriceSchema,
      ItemWarehouseStockSchema,
      BusinessPartnerSchema,
      BusinessPartnerAddressSchema,
      TaxGroupSchema,
      UnitOfMeasurementSchema,
      WarehouseSchema,
      SalesOrderSchema,
      SalesQuotationSchema,
      ARInvoiceSchema,
      ARCreditMemoSchema,
      IncomingPaymentSchema,
      SalesEmployeeSchema,
      GRPOHeaderSchema,
      APInvoiceHeaderSchema,
      APCreditMemoHeaderSchema,
    ],
    host: config.sql.host,
    logger: "simple-console",
    logging: config.nodeEnv === "development" ? ["error"] : false,
    migrations: ["src/migrations/*.sql"],
    password: config.sql.password,
    port: config.sql.port,
    subscribers: [],
    synchronize: false,
    type: "mssql",
    username: config.sql.username,
  });

  tenantDataSources.set(dbName, tenantDs);
  return tenantDs;
};

export const initializeDatabase = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info({
        database: config.sql.commonDb,
        msg: "TypeORM Common DB initialized",
      });
    }
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      error: caughtError.message,
      msg: "TypeORM initialization failed",
    });
    throw caughtError;
  }
};

export const initializeTenantDatabase = async (dbName: string): Promise<DataSource> => {
  const ds = getTenantDataSource(dbName);
  if (!ds.isInitialized) {
    await ds.initialize();
    logger.info({ dbName, msg: "Tenant DB initialized" });
  }
  return ds;
};

export const closeAllTenantDataSources = async (): Promise<void> => {
  const closePromises = [...tenantDataSources.entries()].map(async ([, dataSource]) => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  await Promise.all(closePromises);
  tenantDataSources.clear();
};

export const getTenantDataSourceStats = () => ({
  activeTenants: tenantDataSources.size,
  tenants: Array.from(tenantDataSources.keys()),
});
