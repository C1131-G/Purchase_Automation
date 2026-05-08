// Warehouse Schema: Maps to the native SAP B1 'OWHS' table.
// Defines physical or logical storage locations.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface Warehouse {
  WhsCode: string; // The primary warehouse code.
  WhsName: string; // Name of the warehouse.
  Inactive?: string; // Status flag.
}

export const WarehouseSchema = new EntitySchema<Warehouse>({
  columns: {
    Inactive: {
      default: "N",
      length: 1,
      name: "Inactive",
      type: "nvarchar" as HANAColumnType,
    },
    WhsCode: {
      length: 50,
      name: "WhsCode",
      primary: true,
      type: "nvarchar" as HANAColumnType,
    },
    WhsName: {
      length: 100,
      name: "WhsName",
      type: "nvarchar" as HANAColumnType,
    },
  },
  name: "Warehouse",
  tableName: "OWHS",
});
