// Goods Receipt Schema: Maps to the native SAP B1 'OIGN' table.

import { EntitySchema } from "typeorm";
import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface GoodsReceipt {
  docEntry: number;
  docNum: number;
  docDate: Date;
  taxDate: Date;
  comments?: string;
  jrnlMemo?: string;
  docTotal: number;
  docStatus: string;
  docCurr?: string;
}

export const GoodsReceiptSchema = new EntitySchema<GoodsReceipt>({
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
    taxDate: {
      name: "TaxDate",
      type: "date" as HANAColumnType,
    },
    comments: {
      length: 254,
      name: "Comments",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    jrnlMemo: {
      length: 50,
      name: "JrnlMemo",
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
    { columns: ["docNum"], name: "IDX_OIGN_DOCNUM" },
    { columns: ["docDate"], name: "IDX_OIGN_DOCDATE" },
  ],
  name: "GoodsReceipt",
  tableName: "OIGN",
});
