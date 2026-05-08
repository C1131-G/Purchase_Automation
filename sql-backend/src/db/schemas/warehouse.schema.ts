import { EntitySchema } from "typeorm";

export interface Warehouse {
  whsCode: string;
  whsName: string;
}

export const WarehouseSchema = new EntitySchema<Warehouse>({
  columns: {
    whsCode: { length: 8, name: "WhsCode", primary: true, type: "nvarchar" },
    whsName: { length: 100, name: "WhsName", type: "nvarchar" },
  },
  name: "Warehouse",
  tableName: "OWHS",
});
