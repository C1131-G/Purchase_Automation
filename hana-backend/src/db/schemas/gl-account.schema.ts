// GL Account Schema: Maps to the SAP B1 'DSC1' table (Chart of Accounts).
// Provides account lookup for outgoing payment creation.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface GlAccount {
  BankCode: string;
  GLAccount: string;
}

export const GlAccountSchema = new EntitySchema<GlAccount>({
  name: "GlAccount",
  tableName: "DSC1",
  columns: {
    BankCode: {
      name: "BankCode",
      type: "nvarchar" as HANAColumnType,
      length: 20,
      primary: true,
    },
    GLAccount: {
      name: "GLAccount",
      type: "nvarchar" as HANAColumnType,
      length: 100,
    },
  },
  indices: [{ columns: ["GLAccount"], name: "IDX_DSC1_GLACCOUNT" }],
});
