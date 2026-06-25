// AR Credit Memo Schema: Maps to the native SAP B1 'ORIN' table (Accounts Receivable Credit Memo).
// Used to track customer returns and credit adjustments.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface ArCreditMemo {
  docEntry: number; // Internal SAP key (Primary).
  docNum: number; // Visible SAP document number.
  docDate: Date;
  cardCode: string; // Customer code.
  cardName: string; // Customer name.
  docTotal: number;
  docCurr: string;
  docStatus: string; // 'O' = Open, 'C' = Closed.
  paidToDate: number;
  address?: string;
  address2?: string;
  atcEntry?: number | null;
}

export const ARCreditMemoSchema = new EntitySchema<ArCreditMemo>({
  columns: {
    address: {
      length: 254,
      name: "Address",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    address2: {
      length: 254,
      name: "Address2",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    atcEntry: {
      name: "AtcEntry",
      nullable: true,
      type: "int" as HANAColumnType,
    },
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
    { columns: ["docNum"], name: "IDX_ORIN_DOCNUM" },
    { columns: ["docDate"], name: "IDX_ORIN_DOCDATE" },
    { columns: ["cardCode"], name: "IDX_ORIN_CARDCODE" },
    { columns: ["cardName"], name: "IDX_ORIN_CARDNAME" },
  ],
  name: "ArCreditMemo",
  tableName: "ORIN",
});
