import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface AdminSettings {
  Code: string;
  MainCurncy?: string;
}

export const AdminSettingsSchema = new EntitySchema<AdminSettings>({
  columns: {
    Code: {
      length: 20,
      name: "Code",
      primary: true,
      type: "nvarchar" as HANAColumnType,
    },
    MainCurncy: {
      length: 3,
      name: "MainCurncy",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
  },
  name: "AdminSettings",
  tableName: "OADM",
});
