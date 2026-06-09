// Chart of Accounts Schema: Maps to the SAP B1 'OACT' table.
// Provides account lookup for incoming payment creation.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface ChartOfAccount {
  AcctCode: string;
  AcctName: string;
  Postable: string;
  Finanse: string;
}

export const ChartOfAccountSchema = new EntitySchema<ChartOfAccount>({
  name: "ChartOfAccount",
  tableName: "OACT",
  columns: {
    AcctCode: {
      name: "AcctCode",
      type: "nvarchar" as HANAColumnType,
      length: 15,
      primary: true,
    },
    AcctName: {
      name: "AcctName",
      type: "nvarchar" as HANAColumnType,
      length: 100,
    },
    Postable: {
      name: "Postable",
      type: "nvarchar" as HANAColumnType,
      length: 1,
    },
    Finanse: {
      name: "Finanse",
      type: "nvarchar" as HANAColumnType,
      length: 1,
    },
  },
  indices: [{ columns: ["AcctName"], name: "IDX_OACT_ACCTNAME" }],
});
