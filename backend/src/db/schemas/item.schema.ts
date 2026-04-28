// Item Schema: Maps to the native SAP B1 'OITM' table.
// Represents the Master Data for all products and services available for purchase or sale.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type Item = {
  ItemCode: string;
  ItemName: string;
  SalUnitMsr?: string;
  BuyUnitMsr?: string;
  AvgPrice?: number;
  LastPurCur?: string;
  VatGroupPu?: string;
  VatGroupSa?: string;
  DfltWH?: string;
  frozenFor?: string;
  PrchseItem?: string;
  SellItem?: string;
};

export const ItemSchema = new EntitySchema<Item>({
  name: "Item",
  tableName: "OITM",
  columns: {
    ItemCode: { primary: true, type: "nvarchar" as HANAColumnType, length: 50, name: "ItemCode" },
    ItemName: { type: "nvarchar" as HANAColumnType, length: 100, name: "ItemName" },
    SalUnitMsr: {
      type: "nvarchar" as HANAColumnType,
      length: 100,
      name: "SalUnitMsr",
      nullable: true,
    },
    BuyUnitMsr: {
      type: "nvarchar" as HANAColumnType,
      length: 100,
      name: "BuyUnitMsr",
      nullable: true,
    },
    AvgPrice: {
      type: "decimal" as HANAColumnType,
      precision: 19,
      scale: 6,
      name: "AvgPrice",
      nullable: true,
    },
    LastPurCur: {
      type: "nvarchar" as HANAColumnType,
      length: 3,
      name: "LastPurCur",
      nullable: true,
    },
    VatGroupPu: {
      type: "nvarchar" as HANAColumnType,
      length: 8,
      name: "VatGroupPu",
      nullable: true,
    },
    VatGroupSa: {
      type: "nvarchar" as HANAColumnType,
      length: 8,
      name: "VatGourpSa",
      nullable: true,
    },
    DfltWH: { type: "nvarchar" as HANAColumnType, length: 50, name: "DfltWH", nullable: true },
    frozenFor: { type: "nvarchar" as HANAColumnType, length: 1, name: "frozenFor", default: "N" },
    PrchseItem: {
      type: "nvarchar" as HANAColumnType,
      length: 1,
      name: "PrchseItem",
      nullable: true,
    },
    SellItem: { type: "nvarchar" as HANAColumnType, length: 1, name: "SellItem", nullable: true },
  },
});
