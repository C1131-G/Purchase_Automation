// Tax Group Schema: Maps to the native SAP B1 'OVTG' table.
// Stores tax codes and their corresponding percentages (Rates) for duty calculations.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface TaxGroup {
  Code: string; // The primary tax identifier (e.g., 'GST18').
  Name: string; // Friendly name of the tax.
  Category?: string; // I = purchase (input), O = sales (output).
  Rate: number; // The percentage value.
  Inactive?: string; // Status flag.
}

export const TaxGroupSchema = new EntitySchema<TaxGroup>({
  columns: {
    Code: {
      length: 50,
      name: "Code",
      primary: true,
      type: "nvarchar" as HANAColumnType,
    },
    Inactive: {
      default: "N",
      length: 1,
      name: "Inactive",
      type: "nvarchar" as HANAColumnType,
    },
    Name: { length: 100, name: "Name", type: "nvarchar" as HANAColumnType },
    Category: {
      length: 1,
      name: "Category",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    Rate: {
      name: "Rate",
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
  },
  name: "TaxGroup",
  tableName: "OVTG",
});
