// Inventory Transfer Line Schema: Maps to the native SAP B1 'WTR1' table.

import { EntitySchema } from "typeorm";
import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface InventoryTransferLine {
  docEntry: number;
  lineNum: number;
  itemCode: string;
  dscription: string;
  quantity: number;
  fromWhsCod: string;
  whsCode: string;
  baseType?: number;
  baseEntry?: number;
  baseLine?: number;
}

export const InventoryTransferLineSchema = new EntitySchema<InventoryTransferLine>({
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
  indices: [{ columns: ["docEntry"], name: "IDX_WTR1_DOCENTRY" }],
  name: "InventoryTransferLine",
  tableName: "WTR1",
});
