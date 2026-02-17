import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type AdminSettings = {
  Code: string;
  MainCurncy?: string;
};

export const AdminSettingsSchema = new EntitySchema<AdminSettings>({
  name: "AdminSettings",
  tableName: "OADM",
  columns: {
    Code: { primary: true, type: "nvarchar" as HANAColumnType, length: 20, name: "Code" },
    MainCurncy: {
      type: "nvarchar" as HANAColumnType,
      length: 3,
      name: "MainCurncy",
      nullable: true,
    },
  },
});
