// Sales Order Schema: Maps to the native SAP B1 'ORDR' table (Sales/Customer document).

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type SalesOrder = {
  docEntry: number; // Internal SAP key (Primary).
  docNum: number; // Visible SAP document number.
  docDate: Date;
  cardCode: string; // Customer code.
  cardName: string; // Customer name.
  docTotal: number;
  docStatus: string; // 'O' = Open, 'C' = Closed.
  canceled: string; // 'Y' = Yes, 'N' = No.
};

export const SalesOrderSchema = new EntitySchema<SalesOrder>({
  name: "SalesOrder",
  tableName: "ORDR",
  columns: {
    docEntry: { primary: true, type: "int" as HANAColumnType, name: "DocEntry" },
    docNum: { type: "int" as HANAColumnType, name: "DocNum" },
    docDate: { type: "date" as HANAColumnType, name: "DocDate" },
    cardCode: { type: "nvarchar" as HANAColumnType, length: 15, name: "CardCode" },
    cardName: { type: "nvarchar" as HANAColumnType, length: 100, name: "CardName" },
    docTotal: { type: "decimal" as HANAColumnType, precision: 19, scale: 6, name: "DocTotal" },
    docStatus: { type: "nvarchar" as HANAColumnType, length: 1, name: "DocStatus" },
    canceled: { type: "nvarchar" as HANAColumnType, length: 1, name: "CANCELED" },
  },
  indices: [
    { name: "IDX_ORDR_DOCNUM", columns: ["docNum"] },
    { name: "IDX_ORDR_DOCDATE", columns: ["docDate"] },
    { name: "IDX_ORDR_CARDCODE", columns: ["cardCode"] },
    { name: "IDX_ORDR_CARDNAME", columns: ["cardName"] },
  ],
});
