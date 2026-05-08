import { EntitySchema } from "typeorm";

export interface SalesEmployee {
  empID: number;
  firstName: string;
  lastName: string;
  email?: string;
}

export const SalesEmployeeSchema = new EntitySchema<SalesEmployee>({
  columns: {
    email: { length: 100, nullable: true, type: "nvarchar" },
    empID: { name: "EmpID", primary: true, type: "int" },
    firstName: { length: 50, name: "FirstName", type: "nvarchar" },
    lastName: { length: 50, name: "LastName", type: "nvarchar" },
  },
  name: "SalesEmployee",
  tableName: "OEMG",
});
