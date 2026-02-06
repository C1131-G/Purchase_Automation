// Warehouse Schema: Maps to the native SAP B1 'OWHS' table.
// Defines physical or logical storage locations.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type Warehouse = {
  WhsCode: string; // The primary warehouse code.
  WhsName: string; // Name of the warehouse.
  Inactive?: string; // Status flag.
};

export const WarehouseSchema = new EntitySchema<Warehouse>({
  name: "Warehouse",
  tableName: "OWHS",
  columns: {
    WhsCode: { primary: true, type: "nvarchar" as HANAColumnType, length: 50, name: "WhsCode" },
    WhsName: { type: "nvarchar" as HANAColumnType, length: 100, name: "WhsName" },
    Inactive: { type: "nvarchar" as HANAColumnType, length: 1, name: "Inactive", default: "N" },
  },
});
