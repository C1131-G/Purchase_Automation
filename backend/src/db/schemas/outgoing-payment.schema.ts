// Outgoing Payment Schema: Maps to the native SAP B1 'OVPM' table.
// Tracks payments made to vendors.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type OutgoingPayment = {
  docEntry: number;
  docNum: number;
  docDate: Date;
  cardCode: string;
  cardName: string;
  docTotal: number;
  docCurr: string;
  paymentMode?: string;
};

export const OutgoingPaymentSchema = new EntitySchema<OutgoingPayment>({
  name: "OutgoingPayment",
  tableName: "OVPM",
  columns: {
    docEntry: { primary: true, type: "int" as HANAColumnType, name: "DocEntry" },
    docNum: { type: "int" as HANAColumnType, name: "DocNum" },
    docDate: { type: "date" as HANAColumnType, name: "DocDate" },
    cardCode: { type: "nvarchar" as HANAColumnType, length: 15, name: "CardCode" },
    cardName: { type: "nvarchar" as HANAColumnType, length: 100, name: "CardName" },
    docTotal: { type: "decimal" as HANAColumnType, precision: 19, scale: 6, name: "DocTotal" },
    docCurr: { type: "nvarchar" as HANAColumnType, length: 3, name: "DocCurr" },
    paymentMode: {
      type: "nvarchar" as HANAColumnType,
      length: 20,
      name: "U_Mode_Pay",
      nullable: true,
    },
  },
  indices: [
    { name: "IDX_OVPM_DOCNUM", columns: ["docNum"] },
    { name: "IDX_OVPM_DOCDATE", columns: ["docDate"] },
    { name: "IDX_OVPM_CARDCODE", columns: ["cardCode"] },
    { name: "IDX_OVPM_CARDNAME", columns: ["cardName"] },
  ],
});
