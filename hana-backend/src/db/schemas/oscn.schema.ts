// OSCN Schema: SAP B1 Business Partner Catalog Numbers (substitute / catalog no.).
// ItemCode = this company's item; Substitute = partner catalog / partner item code.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface OscnCatalog {
  ItemCode: string;
  CardCode: string;
  Substitute?: string | null;
  /** SAP column is truncated as Descriptio. */
  Descriptio?: string | null;
  IsDefault?: string | null;
}

export const OscnSchema = new EntitySchema<OscnCatalog>({
  columns: {
    ItemCode: {
      length: 50,
      name: "ItemCode",
      primary: true,
      type: "nvarchar" as HANAColumnType,
    },
    CardCode: {
      length: 15,
      name: "CardCode",
      primary: true,
      type: "nvarchar" as HANAColumnType,
    },
    Substitute: {
      length: 50,
      name: "Substitute",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    Descriptio: {
      length: 100,
      name: "Descriptio",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    IsDefault: {
      length: 1,
      name: "IsDefault",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
  },
  name: "OscnCatalog",
  tableName: "OSCN",
});
