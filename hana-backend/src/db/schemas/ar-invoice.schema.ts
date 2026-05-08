// AR Invoice Schema: Maps to the native SAP B1 'OINV' table (Accounts Receivable Invoice).
// This schema tracks customer billing and includes payment progress via 'PaidSum'.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface ARInvoice {
  docEntry: number; // Internal SAP key (Primary).
  docNum: number; // Visible SAP document number.
  docDate: Date;
  cardCode: string; // Customer code.
  cardName: string; // Customer name.
  docTotal: number;
  docCurr: string;
  docStatus: string; // 'O' = Open, 'C' = Closed.
  canceled: string; // 'Y' = Yes, 'N' = No.
  paidSum: number; // Total amount already settled against this invoice.
  numAtCard?: string; // Reference number from the customer's purchase order.
}

export const ARInvoiceSchema = new EntitySchema<ARInvoice>({
  columns: {
    canceled: {
      length: 1,
      name: "CANCELED",
      type: "nvarchar" as HANAColumnType,
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
    numAtCard: {
      length: 100,
      name: "NumAtCard",
      nullable: true,
      type: "nvarchar" as HANAColumnType,
    },
    paidSum: {
      name: "PaidSum",
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
  },
  indices: [
    { columns: ["docNum"], name: "IDX_OINV_DOCNUM" },
    { columns: ["docDate"], name: "IDX_OINV_DOCDATE" },
    { columns: ["cardCode"], name: "IDX_OINV_CARDCODE" },
    { columns: ["cardName"], name: "IDX_OINV_CARDNAME" },
  ],
  name: "ARInvoice",
  tableName: "OINV",
});
