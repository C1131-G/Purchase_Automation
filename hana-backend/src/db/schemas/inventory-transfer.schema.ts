// Inventory Transfer Schema: Maps to the native SAP B1 'OWTR' table.

import { EntitySchema } from "typeorm";
import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface InventoryTransfer {
  docEntry: number;
  docNum: number;
  docDate: Date;
  comments?: string;
  filler?: string;
  toWhsCode?: string;
  docTotal: number;
  docStatus: string;
  docCurr?: string;
}

export const InventoryTransferSchema = new EntitySchema<InventoryTransfer>({
  columns: {
    docEntry: {
      name: "DocEntry",
      primary: true,
      type: "int" as HANAColumnType,
    },
    docNum: {
      name: "DocNum",
      type: "int" as HANAColumnType,
    },
    docDate: {
      name: "DocDate",
      type: "date" as HANAColumnType,
    },
    comments: {
      length: 254,
      name: "Comments",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    filler: {
      length: 8,
      name: "Filler",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    toWhsCode: {
      length: 8,
      name: "ToWhsCode",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    docTotal: {
      name: "DocTotal",
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
    docStatus: {
      length: 1,
      name: "DocStatus",
      type: "nvarchar" as HANAColumnType,
    },
    docCurr: {
      length: 3,
      name: "DocCur",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
  },
  indices: [
    { columns: ["docNum"], name: "IDX_OWTR_DOCNUM" },
    { columns: ["docDate"], name: "IDX_OWTR_DOCDATE" },
  ],
  name: "InventoryTransfer",
  tableName: "OWTR",
});
