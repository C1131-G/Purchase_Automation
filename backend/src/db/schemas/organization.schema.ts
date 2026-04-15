// Organization Schema: Maps to the central 'ORGANIZATION' table in the common/discovery database.
// This schema is the source of truth for all active tenants and holds the keys (Service Layer credentials) required to unlock tenant data.

import { EntitySchema } from "typeorm";

import { config } from "@/config/env";
import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type Organization = {
  id: string; // The physical HANA database name (e.g., 'SBODEMOIN').
  companyName: string;
  dbServer: string;
  serviceLayerUsername?: string;
  serviceLayerPassword?: string;
};

export const OrganizationSchema = new EntitySchema<Organization>({
  name: "Organization",
  tableName: config.hana.organizationTable,
  columns: {
    id: {
      primary: true,
      type: "nvarchar" as HANAColumnType,
      length: 100,
      name: "DB_NAME",
    },
    companyName: {
      type: "nvarchar" as HANAColumnType,
      length: 255,
      name: "COMPANY_NAME",
    },
    dbServer: {
      type: "nvarchar" as HANAColumnType,
      length: 255,
      name: "DB_SERVER",
    },
    serviceLayerUsername: {
      type: "nvarchar" as HANAColumnType,
      length: 100,
      name: "SERVICE_LAYER_USERNAME",
    },
    serviceLayerPassword: {
      type: "nvarchar" as HANAColumnType,
      length: 100,
      name: "SERVICE_LAYER_PASSWORD",
    },
  },
});
