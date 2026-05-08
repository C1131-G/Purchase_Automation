import { EntitySchema } from "typeorm";

export interface UnitOfMeasurement {
  uomCode: string;
  uomName: string;
}

export const UnitOfMeasurementSchema = new EntitySchema<UnitOfMeasurement>({
  columns: {
    uomCode: { length: 20, name: "UomCode", primary: true, type: "nvarchar" },
    uomName: { length: 20, name: "UomName", type: "nvarchar" },
  },
  name: "UnitOfMeasurement",
  tableName: "OUOM",
});
