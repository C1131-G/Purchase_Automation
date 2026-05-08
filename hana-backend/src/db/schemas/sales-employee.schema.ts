// Sales Employee Schema: Maps to the native SAP B1 'OSLP' table.
// Represents sales personnel responsible for managing customer/vendor accounts.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface SalesEmployee {
  SlpCode: number; // The internal SAP integer ID.
  SlpName: string; // Name of the employee.
  Active: string; // 'Y' or 'N' status.
}

export const SalesEmployeeSchema = new EntitySchema<SalesEmployee>({
  columns: {
    Active: { length: 1, name: "Active", type: "nvarchar" as HANAColumnType },
    SlpCode: { name: "SlpCode", primary: true, type: "int" as HANAColumnType },
    SlpName: {
      length: 155,
      name: "SlpName",
      type: "nvarchar" as HANAColumnType,
    },
  },
  name: "SalesEmployee",
  tableName: "OSLP",
});
