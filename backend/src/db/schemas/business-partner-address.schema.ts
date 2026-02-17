import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type BusinessPartnerAddress = {
  CardCode: string;
  AdresType: string;
  Address: string;
  Street?: string;
  Block?: string;
  City?: string;
  ZipCode?: string;
  State?: string;
  Country?: string;
};

export const BusinessPartnerAddressSchema = new EntitySchema<BusinessPartnerAddress>({
  name: "BusinessPartnerAddress",
  tableName: "CRD1",
  columns: {
    CardCode: { primary: true, type: "nvarchar" as HANAColumnType, length: 15, name: "CardCode" },
    AdresType: { primary: true, type: "nvarchar" as HANAColumnType, length: 1, name: "AdresType" },
    Address: { primary: true, type: "nvarchar" as HANAColumnType, length: 100, name: "Address" },
    Street: { type: "nvarchar" as HANAColumnType, length: 100, name: "Street", nullable: true },
    Block: { type: "nvarchar" as HANAColumnType, length: 100, name: "Block", nullable: true },
    City: { type: "nvarchar" as HANAColumnType, length: 100, name: "City", nullable: true },
    ZipCode: { type: "nvarchar" as HANAColumnType, length: 20, name: "ZipCode", nullable: true },
    State: { type: "nvarchar" as HANAColumnType, length: 100, name: "State", nullable: true },
    Country: { type: "nvarchar" as HANAColumnType, length: 20, name: "Country", nullable: true },
  },
});
