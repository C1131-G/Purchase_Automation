// AR Credit Memo Schema: Maps to the native SAP B1 'ORIN' table (Accounts Receivable Credit Memo).
// Used to track customer returns and credit adjustments.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type ArCreditMemo = {
  docEntry: number; // Internal SAP key (Primary).
  docNum: number; // Visible SAP document number.
  docDate: Date;
  cardCode: string; // Customer code.
  cardName: string; // Customer name.
  docTotal: number;
  docCurr: string;
  docStatus: string; // 'O' = Open, 'C' = Closed.
};

export const ARCreditMemoSchema = new EntitySchema<ArCreditMemo>({
  name: "ArCreditMemo",
  tableName: "ORIN",
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
    { name: "IDX_ORIN_DOCNUM", columns: ["docNum"] },
    { name: "IDX_ORIN_DOCDATE", columns: ["docDate"] },
    { name: "IDX_ORIN_CARDCODE", columns: ["cardCode"] },
    { name: "IDX_ORIN_CARDNAME", columns: ["cardName"] },
  ],
});
