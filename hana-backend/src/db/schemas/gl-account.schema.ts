// GL Account Schema: Maps to the SAP B1 'DSC1' table (Chart of Accounts).
// Provides account lookup for outgoing payment creation.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface GlAccount {
  GLAccount: string;
  Account: string;
}

export const GlAccountSchema = new EntitySchema<GlAccount>({
  name: "GlAccount",
  tableName: "DSC1",
  columns: {
    GLAccount: {
      name: "GLAccount",
      type: "nvarchar" as HANAColumnType,
      length: 100,
      primary: true,
    },
    Account: {
      name: "Account",
      type: "nvarchar" as HANAColumnType,
      length: 100,
    },
  },
  indices: [{ columns: ["Account"], name: "IDX_DSC1_GLACCOUNT" }],
});
