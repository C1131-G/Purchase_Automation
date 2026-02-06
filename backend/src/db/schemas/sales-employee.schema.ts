// Sales Employee Schema: Maps to the native SAP B1 'OSLP' table.
// Represents sales personnel responsible for managing customer/vendor accounts.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type SalesEmployee = {
  SlpCode: number; // The internal SAP integer ID.
  SlpName: string; // Name of the employee.
  Active: string; // 'Y' or 'N' status.
};

export const SalesEmployeeSchema = new EntitySchema<SalesEmployee>({
  name: "SalesEmployee",
  tableName: "OSLP",
  columns: {
    SlpCode: { primary: true, type: "int" as HANAColumnType, name: "SlpCode" },
    SlpName: { type: "nvarchar" as HANAColumnType, length: 155, name: "SlpName" },
    Active: { type: "nvarchar" as HANAColumnType, length: 1, name: "Active" },
  },
});
