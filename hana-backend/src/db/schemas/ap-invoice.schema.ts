// AP Invoice Schema: Maps to the native SAP B1 'OPCH' table (Accounts Payable Invoice).
// This schema is used for high-performance read operations from the HANA tenant database.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface APInvoice {
  docEntry: number; // Internal SAP key (Primary).
  docNum: number; // Visible SAP document number.
  docDate: Date;
  cardCode: string; // Vendor code.
  cardName: string; // Vendor name.
  docTotal: number;
  docCurr: string;
  docStatus: string; // 'O' = Open, 'C' = Closed.
  paidToDate: number; // Total amount paid against this invoice.
  address?: string;
  address2?: string;
  atcEntry?: number | null;
}

export const APInvoiceSchema = new EntitySchema<APInvoice>({
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
    { columns: ["docNum"], name: "IDX_OPCH_DOCNUM" },
    { columns: ["docDate"], name: "IDX_OPCH_DOCDATE" },
    { columns: ["cardCode"], name: "IDX_OPCH_CARDCODE" },
    { columns: ["cardName"], name: "IDX_OPCH_CARDNAME" },
  ],
  name: "APInvoice",
  tableName: "OPCH",
});
