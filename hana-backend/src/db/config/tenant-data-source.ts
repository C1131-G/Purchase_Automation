// Tenant Data Source: Manages dynamic TypeORM connections for multi-tenancy.

import { DataSource } from "typeorm";

import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";
import { AdminSettingsSchema } from "@/db/schemas/admin-settings.schema";
import { APCreditMemoSchema } from "@/db/schemas/ap-credit-memo.schema";
import { APInvoiceSchema } from "@/db/schemas/ap-invoice.schema";
import { APCreditMemoHeaderSchema } from "@/db/schemas/apcreditmemoheader.schema";
import { APInvoiceHeaderSchema } from "@/db/schemas/apinvoiceheader.schema";
import { ARInvoiceSchema } from "@/db/schemas/ar-invoice.schema";
import { BankDetailsSchema } from "@/db/schemas/bank-details.schema";
import { BusinessPartnerAddressSchema } from "@/db/schemas/business-partner-address.schema";
import { BusinessPartnerSchema } from "@/db/schemas/business-partner.schema";
import { GlAccountSchema } from "@/db/schemas/gl-account.schema";
import { GRPOSchema } from "@/db/schemas/grpo.schema";
import { GRPOHeaderSchema } from "@/db/schemas/grpoheader.schema";
import { ItemPriceSchema } from "@/db/schemas/item-price.schema";
import { ItemWarehouseStockSchema } from "@/db/schemas/item-warehouse-stock.schema";
import { ItemSchema } from "@/db/schemas/item.schema";
import { OrganizationSchema } from "@/db/schemas/organization.schema";
import { OutgoingPaymentSchema } from "@/db/schemas/outgoing-payment.schema";
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { PurchaseQuotationLineSchema } from "@/db/schemas/purchase-quotation-line.schema";
import { PurchaseQuotationSchema } from "@/db/schemas/purchase-quotation.schema";
import { SalesEmployeeSchema } from "@/db/schemas/sales-employee.schema";
import { SalesQuotationSchema } from "@/db/schemas/sales-quotation.schema";
import { SalesQuotationLineSchema } from "@/db/schemas/sales-quotation-line.schema";
import { TaxGroupSchema } from "@/db/schemas/tax-group.schema";
import { UnitOfMeasurementSchema } from "@/db/schemas/unit-of-measurement.schema";
import { UserSchema } from "@/db/schemas/user.schema";
import { WarehouseSchema } from "@/db/schemas/warehouse.schema";
import { AttachmentLineSchema } from "@/db/schemas/attachment-line.schema";

// Cache: Map of dbName to initialized tenant DataSource instances.
const tenantDataSources = new Map<string, DataSource>();

const TENANT_ENTITIES = [
  OrganizationSchema,
  PurchaseOrderSchema,
  PurchaseQuotationSchema,
  PurchaseQuotationLineSchema,
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
  GlAccountSchema,
  AdminSettingsSchema,
  TaxGroupSchema,
  UnitOfMeasurementSchema,
  WarehouseSchema,
  BankDetailsSchema,
  SalesQuotationSchema,
  SalesQuotationLineSchema,
  ARInvoiceSchema,
  SalesEmployeeSchema,
  GRPOHeaderSchema,
  APInvoiceHeaderSchema,
  APCreditMemoHeaderSchema,
  AttachmentLineSchema,
] as const;

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
    entities: [...TENANT_ENTITIES],
    subscribers: [],
    migrations: [],
  });

  // Initialize connection
  await dataSource.initialize();

  // Cache for future requests
  tenantDataSources.set(dbName, dataSource);

  return dataSource;
};

// Graceful Shutdown: Closes all active tenant DataSource connections.
export const closeAllTenantDataSources = async (): Promise<void> => {
  const closePromises = [...tenantDataSources.entries()].map(async ([, dataSource]) => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  await Promise.all(closePromises);
  tenantDataSources.clear();
};

// Statistics: Provides data on active tenant connections.
export const getTenantDataSourceStats = () => ({
  activeTenants: tenantDataSources.size,
  tenants: [...tenantDataSources.keys()],
});
