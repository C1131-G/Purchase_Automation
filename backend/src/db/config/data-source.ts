/**
 * Global Data Source Configuration
 *
 * Configures the primary TypeORM connection to SAP HANA.
 *
 * @module db/config/data-source
 */

import "reflect-metadata";

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
 * TypeORM Data Source instance
 * Configured with connection pooling and caching for optimal performance
 */
export const AppDataSource = new DataSource({
  type: "sap",
  host: config.hana.host,
  port: config.hana.port,
  username: config.hana.systemUser,
  password: config.hana.systemPassword,
  schema: config.hana.commonDb,

  // Connection pool configuration
  poolSize: config.hana.maxPoolSize, // Maximum number of connections

  // Security settings
  encrypt: true,
  extra: {
    sslValidateCertificate: false, // Matching current hana.service.js behavior
  },

  // Schema management
  synchronize: false, // Never auto-sync with existing SAP tables

  // Logging configuration - optimized for performance
  logging: config.nodeEnv === "development" ? ["error"] : false,
  logger: "simple-console",

  // Entity configuration
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
    OrganizationSchema,
  ],
  subscribers: [],
  migrations: [],
});

/**
 * Initialize TypeORM Data Source
 *
 * Establishes connection to SAP HANA and initializes the connection pool.
 * Idempotent - safe to call multiple times.
 *
 * @returns {Promise<void>}
 * @throws {Error} If initialization fails
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info({ msg: "TypeORM initialized", pool_size: 10, entities: 18 });

      // Explicitly test connectivity
      const result = await AppDataSource.query("SELECT 1 FROM DUMMY");
      if (result) {
        logger.info({ msg: "TypeORM Connectivity Tested: OK" });
      }
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ msg: "TypeORM initialization failed", error: error.message });
    throw error;
  }
};
