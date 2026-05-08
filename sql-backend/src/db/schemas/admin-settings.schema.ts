import { EntitySchema } from "typeorm";

export interface AdminSettings {
  Code: string;
  MainCurncy?: string;
}

export const AdminSettingsSchema = new EntitySchema<AdminSettings>({
  columns: {
    Code: { length: 20, name: "Code", primary: true, type: "nvarchar" },
    MainCurncy: {
      length: 3,
      name: "MainCurncy",
      nullable: true,
      type: "nvarchar",
    },
  },
  name: "AdminSettings",
  tableName: "OADM",
});
