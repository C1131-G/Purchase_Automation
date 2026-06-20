// Inventory Transfer Request Line Schema: Maps to the native SAP B1 'WTQ1' table.

import { EntitySchema } from "typeorm";
import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface InventoryTransferRequestLine {
  docEntry: number;
  lineNum: number;
  itemCode: string;
  dscription: string;
  quantity: number;
  fromWhsCod: string;
  whsCode: string;
  openQty: number;
  lineStatus?: string;
}

export const InventoryTransferRequestLineSchema = new EntitySchema<InventoryTransferRequestLine>({
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
    fromWhsCod: {
      length: 8,
      name: "FromWhsCod",
      type: "nvarchar" as HANAColumnType,
    },
    whsCode: {
      length: 8,
      name: "WhsCode",
      type: "nvarchar" as HANAColumnType,
    },
    openQty: {
      name: "OpenQty",
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
    lineStatus: {
      length: 1,
      name: "LineStatus",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
  },
  indices: [{ columns: ["docEntry"], name: "IDX_WTQ1_DOCENTRY" }],
  name: "InventoryTransferRequestLine",
  tableName: "WTQ1",
});
