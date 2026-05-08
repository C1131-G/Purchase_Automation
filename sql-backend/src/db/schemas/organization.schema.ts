import { EntitySchema } from "typeorm";

export interface Organization {
  id: number;
  dbName: string;
  name: string;
  dbServer: string;
  isActive: boolean;
  createdAt: Date;
}

export const OrganizationSchema = new EntitySchema<Organization>({
  columns: {
    createdAt: {
      default: () => "GETDATE()",
      name: "created_at",
      type: "datetime",
    },
    dbName: {
      length: 100,
      name: "db_name",
      type: "nvarchar",
      unique: true,
    },
    dbServer: {
      length: 255,
      name: "db_server",
      type: "nvarchar",
    },
    id: {
      generated: "identity",
      primary: true,
      type: "int",
    },
    isActive: {
      default: true,
      name: "is_active",
      type: "bit",
    },
    name: {
      length: 255,
      type: "nvarchar",
    },
  },
  name: "Organization",
  tableName: "Organizations",
});
