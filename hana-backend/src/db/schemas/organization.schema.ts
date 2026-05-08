// Organization Schema: Maps to the central 'ORGANIZATION' table in the common/discovery database.
// This schema is the source of truth for all active tenants and holds the keys (Service Layer credentials) required to unlock tenant data.

import { EntitySchema } from "typeorm";

import { config } from "@/config/env";
import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface Organization {
  id: string; // The physical HANA database name (e.g., 'SBODEMOIN').
  companyName: string;
  dbServer: string;
  serviceLayerUsername?: string;
  serviceLayerPassword?: string;
}

export const OrganizationSchema = new EntitySchema<Organization>({
  columns: {
    companyName: {
      length: 255,
      name: "COMPANY_NAME",
      type: "nvarchar" as HANAColumnType,
    },
    dbServer: {
      length: 255,
      name: "DB_SERVER",
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
      type: "nvarchar" as HANAColumnType,
    },
    serviceLayerUsername: {
      length: 100,
      name: "SERVICE_LAYER_USERNAME",
      type: "nvarchar" as HANAColumnType,
    },
  },
  name: "Organization",
  tableName: config.hana.organizationTable,
});
