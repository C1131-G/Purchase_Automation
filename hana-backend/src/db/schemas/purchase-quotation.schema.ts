// Purchase Quotation Schema: Maps to the native SAP B1 'OPQT' table (Purchase Quotation document).

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface PurchaseQuotation {
  docEntry: number;
  docNum: number;
  docDate: Date;
  cardCode: string;
  cardName: string;
  docTotal: number;
  docCurr: string;
  docStatus: string;
  address?: string;
  address2?: string;
  atcEntry?: number | null;
}

export const PurchaseQuotationSchema = new EntitySchema<PurchaseQuotation>({
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
  },
  indices: [
    { columns: ["docNum"], name: "IDX_OPQT_DOCNUM" },
    { columns: ["docDate"], name: "IDX_OPQT_DOCDATE" },
    { columns: ["cardCode"], name: "IDX_OPQT_CARDCODE" },
    { columns: ["cardName"], name: "IDX_OPQT_CARDNAME" },
  ],
  name: "PurchaseQuotation",
  tableName: "OPQT",
});
