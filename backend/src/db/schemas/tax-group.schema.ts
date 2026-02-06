// Tax Group Schema: Maps to the native SAP B1 'OVTG' table.
// Stores tax codes and their corresponding percentages (Rates) for duty calculations.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type TaxGroup = {
  Code: string; // The primary tax identifier (e.g., 'GST18').
  Name: string; // Friendly name of the tax.
  Rate: number; // The percentage value.
  Inactive?: string; // Status flag.
};

export const TaxGroupSchema = new EntitySchema<TaxGroup>({
  name: "TaxGroup",
  tableName: "OVTG",
  columns: {
    Code: { primary: true, type: "nvarchar" as HANAColumnType, length: 50, name: "Code" },
    Name: { type: "nvarchar" as HANAColumnType, length: 100, name: "Name" },
    Rate: { type: "decimal" as HANAColumnType, precision: 19, scale: 6, name: "Rate" },
    Inactive: { type: "nvarchar" as HANAColumnType, length: 1, name: "Inactive", default: "N" },
  },
});
