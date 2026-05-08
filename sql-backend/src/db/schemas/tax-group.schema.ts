import { EntitySchema } from "typeorm";

export interface TaxGroup {
  code: string;
  name: string;
  rate: number;
}

export const TaxGroupSchema = new EntitySchema<TaxGroup>({
  columns: {
    code: { length: 2, name: "Code", primary: true, type: "nvarchar" },
    name: { length: 50, name: "Name", type: "nvarchar" },
    rate: { name: "Rate", precision: 5, scale: 2, type: "decimal" },
  },
  name: "TaxGroup",
  tableName: "OSTT",
});
