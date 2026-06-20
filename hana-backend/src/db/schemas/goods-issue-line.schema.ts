// Goods Issue Line Schema: Maps to the native SAP B1 'IGE1' table.

import { EntitySchema } from "typeorm";
import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface GoodsIssueLine {
  docEntry: number;
  lineNum: number;
  itemCode: string;
  dscription: string;
  quantity: number;
  price: number;
  whsCode: string;
  acctCode: string;
  baseType?: number;
  baseEntry?: number;
  baseLine?: number;
}

export const GoodsIssueLineSchema = new EntitySchema<GoodsIssueLine>({
  columns: {
    docEntry: {
      name: "DocEntry",
      primary: true,
      type: "int" as HANAColumnType,
    },
    lineNum: {
      name: "LineNum",
      primary: true,
      type: "int" as HANAColumnType,
    },
    itemCode: {
      length: 50,
      name: "ItemCode",
      type: "nvarchar" as HANAColumnType,
    },
    dscription: {
      length: 100,
      name: "Dscription",
      type: "nvarchar" as HANAColumnType,
    },
    quantity: {
      name: "Quantity",
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
    price: {
      name: "Price",
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
    whsCode: {
      length: 8,
      name: "WhsCode",
      type: "nvarchar" as HANAColumnType,
    },
    acctCode: {
      length: 15,
      name: "AcctCode",
      type: "nvarchar" as HANAColumnType,
    },
    baseType: {
      name: "BaseType",
      nullable: true,
      type: "int" as HANAColumnType,
    },
    baseEntry: {
      name: "BaseEntry",
      nullable: true,
      type: "int" as HANAColumnType,
    },
    baseLine: {
      name: "BaseLine",
      nullable: true,
      type: "int" as HANAColumnType,
    },
  },
  indices: [{ columns: ["docEntry"], name: "IDX_IGE1_DOCENTRY" }],
  name: "GoodsIssueLine",
  tableName: "IGE1",
});
