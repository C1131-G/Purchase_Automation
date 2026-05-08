import "reflect-metadata";
import { DataSource } from "typeorm";

import { config } from "@/config/env";
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

export const MigrationsDataSource = new DataSource({
  database: config.sql.commonDb,
  entities: [
    OrganizationSchema,
    UserSchema,
    AdminSettingsSchema,
    PurchaseOrderSchema,
    GRPOSchema,
    APInvoiceSchema,
    APCreditMemoSchema,
    OutgoingPaymentSchema,
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
  logging: ["error", "warn"],
  migrations: ["src/migrations/*.sql"],
  password: config.sql.password,
  port: config.sql.port,
  synchronize: false,
  type: "mssql",
  username: config.sql.username,
});
