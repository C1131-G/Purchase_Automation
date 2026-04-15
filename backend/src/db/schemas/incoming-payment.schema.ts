// Incoming Payment Schema: Maps to the native SAP B1 'ORCT' table.
// Tracks payments received from customers.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type IncomingPayment = {
  docEntry: number; // Internal SAP key (Primary).
  docNum: number; // Visible SAP document number.
  docDate: Date;
  cardCode: string; // Customer code.
  cardName: string; // Customer name.
  docTotal: number;
  docCurr: string;
  counterRef?: string; // Reference number for tracking external payments.
};

export const IncomingPaymentSchema = new EntitySchema<IncomingPayment>({
  name: "IncomingPayment",
  tableName: "ORCT",
  columns: {
    docEntry: { primary: true, type: "int" as HANAColumnType, name: "DocEntry" },
    docNum: { type: "int" as HANAColumnType, name: "DocNum" },
    docDate: { type: "date" as HANAColumnType, name: "DocDate" },
    cardCode: { type: "nvarchar" as HANAColumnType, length: 15, name: "CardCode" },
    cardName: { type: "nvarchar" as HANAColumnType, length: 100, name: "CardName" },
    docTotal: { type: "decimal" as HANAColumnType, precision: 19, scale: 6, name: "DocTotal" },
    docCurr: { type: "nvarchar" as HANAColumnType, length: 3, name: "DocCurr" },
    counterRef: {
      type: "nvarchar" as HANAColumnType,
      length: 30,
      name: "CounterRef",
      nullable: true,
    },
  },
  indices: [
    { name: "IDX_ORCT_DOCNUM", columns: ["docNum"] },
    { name: "IDX_ORCT_DOCDATE", columns: ["docDate"] },
    { name: "IDX_ORCT_CARDCODE", columns: ["cardCode"] },
    { name: "IDX_ORCT_CARDNAME", columns: ["cardName"] },
  ],
});
