import "reflect-metadata";
import { DataSource } from "typeorm";

import { AdminSettingsSchema } from "./src/db/schemas/admin-settings.schema";
import { APCreditMemoSchema } from "./src/db/schemas/ap-credit-memo.schema";
import { APInvoiceSchema } from "./src/db/schemas/ap-invoice.schema";
import { APCreditMemoHeaderSchema } from "./src/db/schemas/apcreditmemoheader.schema";
import { APInvoiceHeaderSchema } from "./src/db/schemas/apinvoiceheader.schema";
import { ARCreditMemoSchema } from "./src/db/schemas/ar-credit-memo.schema";
import { ARInvoiceSchema } from "./src/db/schemas/ar-invoice.schema";
import { BusinessPartnerAddressSchema } from "./src/db/schemas/business-partner-address.schema";
import { BusinessPartnerSchema } from "./src/db/schemas/business-partner.schema";
import { GRPOSchema } from "./src/db/schemas/grpo.schema";
import { GRPOHeaderSchema } from "./src/db/schemas/grpoheader.schema";
import { IncomingPaymentSchema } from "./src/db/schemas/incoming-payment.schema";
import { ItemPriceSchema } from "./src/db/schemas/item-price.schema";
import { ItemWarehouseStockSchema } from "./src/db/schemas/item-warehouse-stock.schema";
import { ItemSchema } from "./src/db/schemas/item.schema";
import { OrganizationSchema } from "./src/db/schemas/organization.schema";
import { OutgoingPaymentSchema } from "./src/db/schemas/outgoing-payment.schema";
import { PurchaseOrderSchema } from "./src/db/schemas/purchase-order.schema";
import { SalesEmployeeSchema } from "./src/db/schemas/sales-employee.schema";
import { SalesOrderSchema } from "./src/db/schemas/sales-order.schema";
import { SalesQuotationSchema } from "./src/db/schemas/sales-quotation.schema";
import { TaxGroupSchema } from "./src/db/schemas/tax-group.schema";
import { UnitOfMeasurementSchema } from "./src/db/schemas/unit-of-measurement.schema";
import { UserSchema } from "./src/db/schemas/user.schema";
import { WarehouseSchema } from "./src/db/schemas/warehouse.schema";

import { config } from "./src/config/env";

const MigrationsDataSource = new DataSource({
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

export default MigrationsDataSource;
