// Global Data Source: Configures primary TypeORM connection to SAP HANA.

import "reflect-metadata";
import { DataSource } from "typeorm";

// Configuration
import { config } from "@/config/env";
// Core & Utils
import { logger } from "@/core/logger/pino-logger";
import { APCreditMemoSchema } from "@/db/schemas/ap-credit-memo.schema";
import { APInvoiceSchema } from "@/db/schemas/ap-invoice.schema";
import { ARCreditMemoSchema } from "@/db/schemas/ar-credit-memo.schema";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { BusinessPartnerSchema } from "@/db/schemas/business-partner.schema";
import { GRPOSchema } from "@/db/schemas/grpo.schema";
import { GlAccountSchema } from "@/db/schemas/gl-account.schema";
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

// TypeORM Data Source: Instance configured with connection pooling and caching.
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
    APCreditMemoSchema,
    OutgoingPaymentSchema,
    UserSchema,
    ItemSchema,
    BusinessPartnerSchema,
    TaxGroupSchema,
    UnitOfMeasurementSchema,
    WarehouseSchema,
    SalesOrderSchema,
    ARInvoiceSchema,
    ARCreditMemoSchema,
    IncomingPaymentSchema,
    SalesEmployeeSchema,
    GlAccountSchema,
  ],
  subscribers: [],
  migrations: [],
});

// Initialize Database: Establishes idempotent SAP HANA connection and pool initialization.
export const initializeDatabase = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info({ entities: 19, msg: "TypeORM initialized", pool_size: 10 });

      // Explicitly test connectivity
      const result = await AppDataSource.query("SELECT 1 FROM DUMMY");
      if (result) {
        logger.info({ msg: "TypeORM Connectivity Tested: OK" });
      }
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
