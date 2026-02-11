// AR Invoice Schema: Maps to the native SAP B1 'OINV' table (Accounts Receivable Invoice).
// This schema tracks customer billing and includes payment progress via 'PaidSum'.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type ARInvoice = {
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
};

export const ARInvoiceSchema = new EntitySchema<ARInvoice>({
  name: "ARInvoice",
  tableName: "OINV",
  columns: {
    docEntry: { primary: true, type: "int" as HANAColumnType, name: "DocEntry" },
    docNum: { type: "int" as HANAColumnType, name: "DocNum" },
    docDate: { type: "date" as HANAColumnType, name: "DocDate" },
    cardCode: { type: "nvarchar" as HANAColumnType, length: 15, name: "CardCode" },
    cardName: { type: "nvarchar" as HANAColumnType, length: 100, name: "CardName" },
    docTotal: { type: "decimal" as HANAColumnType, precision: 19, scale: 6, name: "DocTotal" },
    docCurr: { type: "nvarchar" as HANAColumnType, length: 3, name: "DocCur" },
    docStatus: { type: "nvarchar" as HANAColumnType, length: 1, name: "DocStatus" },
    canceled: { type: "nvarchar" as HANAColumnType, length: 1, name: "CANCELED" },
    paidSum: { type: "decimal" as HANAColumnType, precision: 19, scale: 6, name: "PaidSum" },
    numAtCard: {
      type: "nvarchar" as HANAColumnType,
      length: 100,
      name: "NumAtCard",
      nullable: true,
    },
  },
  indices: [
    { name: "IDX_OINV_DOCNUM", columns: ["docNum"] },
    { name: "IDX_OINV_DOCDATE", columns: ["docDate"] },
    { name: "IDX_OINV_CARDCODE", columns: ["cardCode"] },
    { name: "IDX_OINV_CARDNAME", columns: ["cardName"] },
  ],
});
