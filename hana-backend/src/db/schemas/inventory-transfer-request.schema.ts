// Inventory Transfer Request Schema: Maps to the native SAP B1 'OWTQ' table.

import { EntitySchema } from "typeorm";
import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface InventoryTransferRequest {
  docEntry: number;
  docNum: number;
  docDate: Date;
  docStatus: string;
  comments?: string;
  docTotal: number;
  filler?: string;
  toWhsCode?: string;
  docCurr?: string;
}

export const InventoryTransferRequestSchema = new EntitySchema<InventoryTransferRequest>({
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
    docStatus: {
      length: 1,
      name: "DocStatus",
      type: "nvarchar" as HANAColumnType,
    },
    comments: {
      length: 254,
      name: "Comments",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    docTotal: {
      name: "DocTotal",
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
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
    docCurr: {
      length: 3,
      name: "DocCur",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
  },
  indices: [
    { columns: ["docNum"], name: "IDX_OWTQ_DOCNUM" },
    { columns: ["docDate"], name: "IDX_OWTQ_DOCDATE" },
  ],
  name: "InventoryTransferRequest",
  tableName: "OWTQ",
});
