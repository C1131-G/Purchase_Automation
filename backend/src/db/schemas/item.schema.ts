// Item Schema: Maps to the native SAP B1 'OITM' table.
// Represents the Master Data for all products and services available for purchase or sale.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type Item = {
  ItemCode: string; // The primary item/product code.
  ItemName: string; // Product description.
  SalUnitMsr?: string; // Standard unit of measurement (e.g., 'Each', 'Box').
  AvgPrice?: number; // Calculated average cost from SAP for inventory valuation.
  LastPurCur?: string; // Item master purchase currency.
  VatGroupPu?: string; // Purchase tax group code.
  VatGourpSa?: string; // Sales tax group code fallback.
  DfltWH?: string; // Default warehouse where this item is normally stored.
  frozenFor?: string; // 'Y' if the item is inactive.
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
    VatGourpSa: {
      type: "nvarchar" as HANAColumnType,
      length: 8,
      name: "VatGourpSa",
      nullable: true,
    },
    DfltWH: { type: "nvarchar" as HANAColumnType, length: 50, name: "DfltWH", nullable: true },
    frozenFor: { type: "nvarchar" as HANAColumnType, length: 1, name: "frozenFor", default: "N" },
  },
});
