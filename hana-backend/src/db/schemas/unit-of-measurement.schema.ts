// Unit of Measurement Schema: Maps to the native SAP B1 'OUOM' table.
// Defines standard units used for stock and pricing (e.g., 'Each', 'KG', 'Hour').

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface UnitOfMeasurement {
  UomEntry?: number; // Internal numeric id used by SAP as UoMEntry.
  UomCode: string; // The primary measurement code.
  UomName: string; // Descriptive name.
}

export const UnitOfMeasurementSchema = new EntitySchema<UnitOfMeasurement>({
  columns: {
    UomCode: {
      length: 50,
      name: "UomCode",
      primary: true,
      type: "nvarchar" as HANAColumnType,
    },
    UomEntry: {
      name: "UomEntry",
      nullable: true,
      type: "integer" as HANAColumnType,
    },
    UomName: {
      length: 100,
      name: "UomName",
      type: "nvarchar" as HANAColumnType,
    },
  },
  name: "UnitOfMeasurement",
  tableName: "OUOM",
});
