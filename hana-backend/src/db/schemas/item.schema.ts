// Item Schema: Maps to the native SAP B1 'OITM' table.
// Represents the Master Data for all products and services available for purchase or sale.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface Item {
  ItemCode: string;
  ItemName: string;
  FrgnName?: string;
  ItmsGrpCod?: number;
  InvntryUom?: string;
  OnHand?: number;
  IsCommited?: number;
  OnOrder?: number;
  AvgPrice?: number;
  LastPurPrc?: number;
  LastPurDat?: Date | null;
  ManBtchNum?: string;
  ManSerNum?: string;
  validFor?: string;
  frozenFor?: string;
  SalUnitMsr?: string;
  BuyUnitMsr?: string;
  LastPurCur?: string;
  VatGroupPu?: string;
  VatGroupSa?: string;
  DfltWH?: string;
  PrchseItem?: string;
  SellItem?: string;
  InvntItem?: string;
  CodeBars?: string;
}

export const ItemSchema = new EntitySchema<Item>({
  columns: {
    AvgPrice: {
      name: "AvgPrice",
      nullable: true,
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
    BuyUnitMsr: {
      length: 100,
      name: "BuyUnitMsr",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    DfltWH: {
      length: 50,
      name: "DfltWH",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    ItemCode: {
      length: 50,
      name: "ItemCode",
      primary: true,
      type: "nvarchar" as HANAColumnType,
    },
    ItemName: {
      length: 100,
      name: "ItemName",
      type: "nvarchar" as HANAColumnType,
    },
    LastPurCur: {
      length: 3,
      name: "LastPurCur",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    PrchseItem: {
      length: 1,
      name: "PrchseItem",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    SalUnitMsr: {
      length: 100,
      name: "SalUnitMsr",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    SellItem: {
      length: 1,
      name: "SellItem",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    VatGroupPu: {
      length: 8,
      name: "VatGroupPu",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    VatGroupSa: {
      length: 8,
      name: "VatGourpSa",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    frozenFor: {
      default: "N",
      length: 1,
      name: "frozenFor",
      type: "nvarchar" as HANAColumnType,
    },
    FrgnName: {
      length: 100,
      name: "FrgnName",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    ItmsGrpCod: {
      name: "ItmsGrpCod",
      nullable: true,
      type: "smallint" as HANAColumnType,
    },
    InvntryUom: {
      length: 20,
      name: "InvntryUom",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    OnHand: {
      name: "OnHand",
      nullable: true,
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
    IsCommited: {
      name: "IsCommited",
      nullable: true,
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
    OnOrder: {
      name: "OnOrder",
      nullable: true,
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
    LastPurPrc: {
      name: "LastPurPrc",
      nullable: true,
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
    LastPurDat: {
      name: "LastPurDat",
      nullable: true,
      type: "date" as HANAColumnType,
    },
    ManBtchNum: {
      length: 1,
      name: "ManBtchNum",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    ManSerNum: {
      length: 1,
      name: "ManSerNum",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    validFor: {
      default: "Y",
      length: 1,
      name: "validFor",
      type: "nvarchar" as HANAColumnType,
    },
    InvntItem: {
      default: "Y",
      length: 1,
      name: "InvntItem",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    CodeBars: {
      length: 254,
      name: "CodeBars",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
  },
  name: "Item",
  tableName: "OITM",
});
