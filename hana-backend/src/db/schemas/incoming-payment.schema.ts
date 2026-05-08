// Incoming Payment Schema: Maps to the native SAP B1 'ORCT' table.
// Tracks payments received from customers.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface IncomingPayment {
  docEntry: number; // Internal SAP key (Primary).
  docNum: number; // Visible SAP document number.
  docDate: Date;
  cardCode: string; // Customer code.
  cardName: string; // Customer name.
  docTotal: number;
  docCurr: string;
  counterRef?: string; // Reference number for tracking external payments.
  paymentMode?: string; // U_Mode_Pay
}

export const IncomingPaymentSchema = new EntitySchema<IncomingPayment>({
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
    counterRef: {
      length: 30,
      name: "CounterRef",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    docCurr: { length: 3, name: "DocCurr", type: "nvarchar" as HANAColumnType },
    docDate: { name: "DocDate", type: "date" as HANAColumnType },
    docEntry: {
      name: "DocEntry",
      primary: true,
      type: "int" as HANAColumnType,
    },
    docNum: { name: "DocNum", type: "int" as HANAColumnType },
    docTotal: {
      name: "DocTotal",
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
    paymentMode: {
      length: 20,
      name: "U_Mode_Pay",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
  },
  indices: [
    { columns: ["docNum"], name: "IDX_ORCT_DOCNUM" },
    { columns: ["docDate"], name: "IDX_ORCT_DOCDATE" },
    { columns: ["cardCode"], name: "IDX_ORCT_CARDCODE" },
    { columns: ["cardName"], name: "IDX_ORCT_CARDNAME" },
  ],
  name: "IncomingPayment",
  tableName: "ORCT",
});
