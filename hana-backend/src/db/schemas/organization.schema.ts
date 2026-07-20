// Organization Schema: Maps to the central organization registry in the common DB
// (typically SBOCOMMON.VST_COMMON). Holds tenant discovery fields plus intercompany
// partner codes and Service Layer credentials.

import { EntitySchema } from "typeorm";

import { config } from "@/config/env";
import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface Organization {
  id: string; // Physical HANA database name (e.g. 'AJAX_POS_DB').
  companyName: string;
  dbServer: string;
  dbType?: string;
  dbUsername?: string;
  dbPassword?: string;
  serviceLayerUsername?: string;
  serviceLayerPassword?: string;
  /** Intercompany vendor code this company represents in partner companies. */
  vendorCode?: string;
  /** Intercompany customer code for this company when selling into partner companies. */
  customerCode?: string;
}

export const OrganizationSchema = new EntitySchema<Organization>({
  columns: {
    companyName: {
      length: 255,
      name: "COMPANY_NAME",
      type: "nvarchar" as HANAColumnType,
    },
    customerCode: {
      length: 50,
      name: "CUSTOMER_CODE",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    dbPassword: {
      length: 255,
      name: "DB_PASSWORD",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    dbServer: {
      length: 255,
      name: "DB_SERVER",
      type: "nvarchar" as HANAColumnType,
    },
    dbType: {
      length: 50,
      name: "DB_TYPE",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    dbUsername: {
      length: 100,
      name: "DB_USERNAME",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    id: {
      length: 100,
      name: "DB_NAME",
      primary: true,
      type: "nvarchar" as HANAColumnType,
    },
    serviceLayerPassword: {
      length: 100,
      name: "SERVICE_LAYER_PASSWORD",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    serviceLayerUsername: {
      length: 100,
      name: "SERVICE_LAYER_USERNAME",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    vendorCode: {
      length: 50,
      name: "VENDOR_CODE",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
  },
  name: "Organization",
  tableName: config.hana.organizationTable,
});
