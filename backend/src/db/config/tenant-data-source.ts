/**
 * Tenant Data Source Configuration
 *
 * Manages dynamic TypeORM connections for multi-tenancy.
 *
 * @module db/config/tenant-data-source
 */

import { DataSource } from "typeorm";

// Configuration
import { config } from "@/config/env";
// Core & Utils
import { logger } from "@/core/logger/pino-logger";
import { APCreditNoteSchema } from "@/db/schemas/ap-credit-note.schema";
import { APInvoiceSchema } from "@/db/schemas/ap-invoice.schema";
import { ARCreditNoteSchema } from "@/db/schemas/ar-credit-note.schema";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { BusinessPartnerSchema } from "@/db/schemas/business-partner.schema";
import { GRPOSchema } from "@/db/schemas/grpo.schema";
import { IncomingPaymentSchema } from "@/db/schemas/incoming-payment.schema";
import { ItemSchema } from "@/db/schemas/item.schema";
// Schemas
import { OrganizationSchema } from "@/db/schemas/organization.schema";
import { OutgoingPaymentSchema } from "@/db/schemas/outgoing-payment.schema";
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { SalesEmployeeSchema } from "@/db/schemas/sales-employee.schema";
import { SalesOrderSchema } from "@/db/schemas/sales-order.schema";
import { TaxGroupSchema } from "@/db/schemas/tax-group.schema";
import { UnitOfMeasurementSchema } from "@/db/schemas/unit-of-measurement.schema";
import { UserSchema } from "@/db/schemas/user.schema";
import { WarehouseSchema } from "@/db/schemas/warehouse.schema";

/**
 * Cache of tenant DataSource instances
 * Key: dbName (e.g., "AJAX_POS_DB")
 * Value: Initialized DataSource instance
 */
const tenantDataSources = new Map<string, DataSource>();

/**
 * Get or create a DataSource for a specific tenant
 *
 * @param {string} dbName - Tenant database name (e.g., "AJAX_POS_DB")
 * @returns {Promise<DataSource>} Initialized DataSource for the tenant
 */
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
      APCreditNoteSchema,
      OutgoingPaymentSchema,
      UserSchema,
      ItemSchema,
      BusinessPartnerSchema,
      TaxGroupSchema,
      UnitOfMeasurementSchema,
      WarehouseSchema,
      SalesOrderSchema,
      ARInvoiceSchema,
      ARCreditNoteSchema,
      IncomingPaymentSchema,
      SalesEmployeeSchema,
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

/**
 * Close all tenant DataSource connections
 * Called during graceful shutdown
 *
 * @returns {Promise<void>}
 */
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

/**
 * Get statistics about active tenant connections
 *
 * @returns {Object} Connection statistics
 */
export const getTenantDataSourceStats = () => {
  return {
    activeTenants: tenantDataSources.size,
    tenants: Array.from(tenantDataSources.keys()),
  };
};
