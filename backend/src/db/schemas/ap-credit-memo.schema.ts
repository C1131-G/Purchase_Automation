// AP Credit Note Schema: Maps to the native SAP B1 'ORPC' table (Accounts Payable Credit Memo).
// Used to track vendor credits and returns.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type APCreditMemo = {
  docEntry: number; // Internal SAP key (Primary).
  docNum: number; // Visible SAP document number.
  docDate: Date;
  cardCode: string; // Vendor code.
  cardName: string; // Vendor name.
  docTotal: number;
  docCurr: string;
  docStatus: string; // 'O' = Open, 'C' = Closed.
};

export const APCreditMemoSchema = new EntitySchema<APCreditMemo>({
  name: "APCreditMemo",
  tableName: "ORPC",
  columns: {
    docEntry: { primary: true, type: "int" as HANAColumnType, name: "DocEntry" },
    docNum: { type: "int" as HANAColumnType, name: "DocNum" },
    docDate: { type: "date" as HANAColumnType, name: "DocDate" },
    cardCode: { type: "nvarchar" as HANAColumnType, length: 15, name: "CardCode" },
    cardName: { type: "nvarchar" as HANAColumnType, length: 100, name: "CardName" },
    docTotal: { type: "decimal" as HANAColumnType, precision: 19, scale: 6, name: "DocTotal" },
    docCurr: { type: "nvarchar" as HANAColumnType, length: 3, name: "DocCur" },
    docStatus: { type: "nvarchar" as HANAColumnType, length: 1, name: "DocStatus" },
  },
  indices: [
    { name: "IDX_ORPC_DOCNUM", columns: ["docNum"] },
    { name: "IDX_ORPC_DOCDATE", columns: ["docDate"] },
    { name: "IDX_ORPC_CARDCODE", columns: ["cardCode"] },
    { name: "IDX_ORPC_CARDNAME", columns: ["cardName"] },
  ],
});
