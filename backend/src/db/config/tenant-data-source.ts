// Tenant Data Source: Manages dynamic TypeORM connections for multi-tenancy.

import { DataSource } from "typeorm";

import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";
import { AdminSettingsSchema } from "@/db/schemas/admin-settings.schema";
import { APCreditMemoSchema } from "@/db/schemas/ap-credit-memo.schema";
import { APInvoiceSchema } from "@/db/schemas/ap-invoice.schema";
import { ARCreditNoteSchema } from "@/db/schemas/ar-credit-note.schema";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { BusinessPartnerSchema } from "@/db/schemas/business-partner.schema";
import { BusinessPartnerAddressSchema } from "@/db/schemas/business-partner-address.schema";
import { GRPOSchema } from "@/db/schemas/grpo.schema";
import { IncomingPaymentSchema } from "@/db/schemas/incoming-payment.schema";
import { ItemSchema } from "@/db/schemas/item.schema";
import { ItemPriceSchema } from "@/db/schemas/item-price.schema";
import { ItemWarehouseStockSchema } from "@/db/schemas/item-warehouse-stock.schema";
import { OrganizationSchema } from "@/db/schemas/organization.schema";
import { OutgoingPaymentSchema } from "@/db/schemas/outgoing-payment.schema";
import { PCH1Schema } from "@/db/schemas/pch1.schema";
import { PDN1Schema } from "@/db/schemas/pdn1.schema";
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { SalesEmployeeSchema } from "@/db/schemas/sales-employee.schema";
import { SalesOrderSchema } from "@/db/schemas/sales-order.schema";
import { SalesQuotationSchema } from "@/db/schemas/sales-quotation.schema";
import { TaxGroupSchema } from "@/db/schemas/tax-group.schema";
import { UnitOfMeasurementSchema } from "@/db/schemas/unit-of-measurement.schema";
import { UserSchema } from "@/db/schemas/user.schema";
import { WarehouseSchema } from "@/db/schemas/warehouse.schema";

// Cache: Map of dbName to initialized tenant DataSource instances.
const tenantDataSources = new Map<string, DataSource>();

// Get or create DataSource for a specific tenant DB.
export const getTenantDataSource = async (dbName: string): Promise<DataSource> => {
  // Return cached DataSource if already initialized
  const cached = tenantDataSources.get(dbName);
  if (cached) {
    return cached;
  }

  logger.info({ msg: "Creating new tenant DataSource", tenant: dbName });

  // Create new DataSource for this tenant
  const dataSource = new DataSource({
    type: "sap",
    host: config.hana.host,
    port: config.hana.port,
    username: config.hana.systemUser,
    password: config.hana.systemPassword,
    schema: dbName, // Tenant-specific schema

    // Connection pool configuration
    poolSize: config.hana.maxPoolSize,

    // Security settings
    encrypt: true,
    extra: {
      sslValidateCertificate: false,
    },

    // Schema management
    synchronize: false, // Never auto-sync with SAP tables

    // Logging
    logging: config.nodeEnv === "development" ? ["error"] : false,
    logger: "simple-console",

    // Shared entities across all tenants
    entities: [
      OrganizationSchema,
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
      AdminSettingsSchema,
      TaxGroupSchema,
      UnitOfMeasurementSchema,
      WarehouseSchema,
      SalesOrderSchema,
      SalesQuotationSchema,
      ARInvoiceSchema,
      ARCreditNoteSchema,
      IncomingPaymentSchema,
      SalesEmployeeSchema,
      PDN1Schema,
      PCH1Schema,
    ],
    subscribers: [],
    migrations: [],
  });

  // Initialize connection
  await dataSource.initialize();

  logger.info({
    msg: "Tenant DataSource initialized",
    tenant: dbName,
    poolSize: 5,
    entities: 18,
  });

  // Cache for future requests
  tenantDataSources.set(dbName, dataSource);

  return dataSource;
};

// Graceful Shutdown: Closes all active tenant DataSource connections.
export const closeAllTenantDataSources = async (): Promise<void> => {
  logger.info({ msg: "Closing all tenant DataSources", count: tenantDataSources.size });

  const closePromises = Array.from(tenantDataSources.entries()).map(
    async ([dbName, dataSource]) => {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
        logger.info({ msg: "Tenant DataSource closed", tenant: dbName });
      }
    },
  );

  await Promise.all(closePromises);
  tenantDataSources.clear();
};

// Statistics: Provides data on active tenant connections.
export const getTenantDataSourceStats = () => {
  return {
    activeTenants: tenantDataSources.size,
    tenants: Array.from(tenantDataSources.keys()),
  };
};
