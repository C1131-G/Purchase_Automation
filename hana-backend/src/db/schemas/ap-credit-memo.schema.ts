// AP Credit Note Schema: Maps to the native SAP B1 'ORPC' table (Accounts Payable Credit Memo).
// Used to track vendor credits and returns.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface APCreditMemo {
  docEntry: number; // Internal SAP key (Primary).
  docNum: number; // Visible SAP document number.
  docDate: Date;
  cardCode: string; // Vendor code.
  cardName: string; // Vendor name.
  docTotal: number;
  docCurr: string;
  docStatus: string; // 'O' = Open, 'C' = Closed.
  paidToDate: number; // Total amount paid/credited against this memo.
}

export const APCreditMemoSchema = new EntitySchema<APCreditMemo>({
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
    paidToDate: {
      name: "PaidToDate",
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
  },
  indices: [
    { columns: ["docNum"], name: "IDX_ORPC_DOCNUM" },
    { columns: ["docDate"], name: "IDX_ORPC_DOCDATE" },
    { columns: ["cardCode"], name: "IDX_ORPC_CARDCODE" },
    { columns: ["cardName"], name: "IDX_ORPC_CARDNAME" },
  ],
  name: "APCreditMemo",
  tableName: "ORPC",
});
