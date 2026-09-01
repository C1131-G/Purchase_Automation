// Outgoing Payment Schema: Maps to the native SAP B1 'OVPM' table.
// Tracks payments made to vendors.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface OutgoingPayment {
  docEntry: number;
  docNum: number;
  docDate: Date;
  dueDate?: Date;
  cardCode: string;
  cardName: string;
  docTotal: number;
  docCurr: string;
  paymentMode?: string;
}

export const OutgoingPaymentSchema = new EntitySchema<OutgoingPayment>({
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
    docCurr: { length: 3, name: "DocCurr", type: "nvarchar" as HANAColumnType },
    docDate: { name: "DocDate", type: "date" as HANAColumnType },
    // OVPM header due date is DocDueDate; DueDate only exists on VPM1 check lines.
    dueDate: { name: "DocDueDate", nullable: true, type: "date" as HANAColumnType },
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
    { columns: ["docNum"], name: "IDX_OVPM_DOCNUM" },
    { columns: ["docDate"], name: "IDX_OVPM_DOCDATE" },
    { columns: ["cardCode"], name: "IDX_OVPM_CARDCODE" },
    { columns: ["cardName"], name: "IDX_OVPM_CARDNAME" },
  ],
  name: "OutgoingPayment",
  tableName: "OVPM",
});
