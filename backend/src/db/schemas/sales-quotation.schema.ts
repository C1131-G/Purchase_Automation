// Sales Quotation Schema: Maps to the native SAP B1 'OQUT' table (Sales Quotation document).

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type SalesQuotation = {
  docEntry: number; // Internal SAP key (Primary).
  docNum: number; // Visible SAP document number.
  docDate: Date;
  cardCode: string; // Customer code.
  cardName: string; // Customer name.
  docTotal: number;
  docCurr: string;
  docStatus: string; // 'O' = Open, 'C' = Closed.
};

export const SalesQuotationSchema = new EntitySchema<SalesQuotation>({
  name: "SalesQuotation",
  tableName: "OQUT",
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
    { name: "IDX_OQUT_DOCNUM", columns: ["docNum"] },
    { name: "IDX_OQUT_DOCDATE", columns: ["docDate"] },
    { name: "IDX_OQUT_CARDCODE", columns: ["cardCode"] },
    { name: "IDX_OQUT_CARDNAME", columns: ["cardName"] },
  ],
});
