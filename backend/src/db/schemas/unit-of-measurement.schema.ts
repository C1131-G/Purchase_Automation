// Unit of Measurement Schema: Maps to the native SAP B1 'OUOM' table.
// Defines standard units used for stock and pricing (e.g., 'Each', 'KG', 'Hour').

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type UnitOfMeasurement = {
  UomCode: string; // The primary measurement code.
  UomName: string; // Descriptive name.
};

export const UnitOfMeasurementSchema = new EntitySchema<UnitOfMeasurement>({
  name: "UnitOfMeasurement",
  tableName: "OUOM",
  columns: {
    UomCode: { primary: true, type: "nvarchar" as HANAColumnType, length: 50, name: "UomCode" },
    UomName: { type: "nvarchar" as HANAColumnType, length: 100, name: "UomName" },
  },
});
