// Sales Order Schema: Maps to the native SAP B1 'ORDR' table (Sales/Customer document).

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface SalesOrder {
  docEntry: number; // Internal SAP key (Primary).
  docNum: number; // Visible SAP document number.
  docDate: Date;
  cardCode: string; // Customer code.
  cardName: string; // Customer name.
  docTotal: number;
  docCurr: string;
  docStatus: string; // 'O' = Open, 'C' = Closed.
}

export const SalesOrderSchema = new EntitySchema<SalesOrder>({
  columns: {
    cardCode: {
      length: 15,
      name: "CardCode",
      type: "nvarchar" as HANAColumnType,
    },
    cardName: {
      length: 100,
      name: "CardName",
      type: "nvarchar" as HANAColumnType,
    },
    docCurr: { length: 3, name: "DocCur", type: "nvarchar" as HANAColumnType },
    docDate: { name: "DocDate", type: "date" as HANAColumnType },
    docEntry: {
      name: "DocEntry",
      primary: true,
      type: "int" as HANAColumnType,
    },
    docNum: { name: "DocNum", type: "int" as HANAColumnType },
    docStatus: {
      length: 1,
      name: "DocStatus",
      type: "nvarchar" as HANAColumnType,
    },
    docTotal: {
      name: "DocTotal",
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
  },
  indices: [
    { columns: ["docNum"], name: "IDX_ORDR_DOCNUM" },
    { columns: ["docDate"], name: "IDX_ORDR_DOCDATE" },
    { columns: ["cardCode"], name: "IDX_ORDR_CARDCODE" },
    { columns: ["cardName"], name: "IDX_ORDR_CARDNAME" },
  ],
  name: "SalesOrder",
  tableName: "ORDR",
});
