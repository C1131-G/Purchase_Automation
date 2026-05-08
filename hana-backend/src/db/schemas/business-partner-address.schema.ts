import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface BusinessPartnerAddress {
  CardCode: string;
  AdresType: string;
  Address: string;
  Street?: string;
  Block?: string;
  City?: string;
  ZipCode?: string;
  State?: string;
  Country?: string;
}

export const BusinessPartnerAddressSchema = new EntitySchema<BusinessPartnerAddress>({
  columns: {
    Address: {
      length: 100,
      name: "Address",
      primary: true,
      type: "nvarchar" as HANAColumnType,
    },
    AdresType: {
      length: 1,
      name: "AdresType",
      primary: true,
      type: "nvarchar" as HANAColumnType,
    },
    Block: {
      length: 100,
      name: "Block",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    CardCode: {
      length: 15,
      name: "CardCode",
      primary: true,
      type: "nvarchar" as HANAColumnType,
    },
    City: {
      length: 100,
      name: "City",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    Country: {
      length: 20,
      name: "Country",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    State: {
      length: 100,
      name: "State",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    Street: {
      length: 100,
      name: "Street",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    ZipCode: {
      length: 20,
      name: "ZipCode",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
  },
  name: "BusinessPartnerAddress",
  tableName: "CRD1",
});
