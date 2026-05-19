// Bank Details Schema: Maps to the SAP B1 'ODSC' table (Banks).
// Provides bank lookup for payment creation.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface BankDetails {
  Country: string;
  BankCode: string;
  BankName: string;
}

export const BankDetailsSchema = new EntitySchema<BankDetails>({
  name: "BankDetails",
  tableName: "ODSC",
  columns: {
    CountryCod: {
      name: "CountryCod",
      type: "nvarchar" as HANAColumnType,
      length: 3,
      primary: true,
    },
    BankCode: {
      name: "BankCode",
      type: "nvarchar" as HANAColumnType,
      length: 20,
    },
    BankName: {
      name: "BankName",
      type: "nvarchar" as HANAColumnType,
      length: 100,
    },
  },
});
