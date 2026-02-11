// Purchase Order Schema: Maps to the native SAP B1 'OPOR' table (Procurement/Purchasing document).

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type PurchaseOrder = {
  docEntry: number; // Internal SAP key (Primary).
  docNum: number; // Visible SAP document number.
  docDate: Date;
  cardCode: string; // Vendor code.
  cardName: string; // Vendor name.
  docTotal: number;
  docCurr: string;
  docStatus: string; // 'O' = Open, 'C' = Closed.
};

export const PurchaseOrderSchema = new EntitySchema<PurchaseOrder>({
  name: "PurchaseOrder",
  tableName: "OPOR",
  columns: {
    docEntry: {
      primary: true,
      type: "int" as HANAColumnType,
      name: "DocEntry",
    },
    docNum: {
      type: "int" as HANAColumnType,
      name: "DocNum",
    },
    docDate: {
      type: "date" as HANAColumnType,
      name: "DocDate",
    },
    cardCode: {
      type: "nvarchar" as HANAColumnType,
      length: 15,
      name: "CardCode",
    },
    cardName: {
      type: "nvarchar" as HANAColumnType,
      length: 100,
      name: "CardName",
    },
    docTotal: {
      type: "decimal" as HANAColumnType,
      precision: 19,
      scale: 6,
      name: "DocTotal",
    },
    docCurr: { type: "nvarchar" as HANAColumnType, length: 3, name: "DocCur" },
    docStatus: {
      type: "nvarchar" as HANAColumnType,
      length: 1,
      name: "DocStatus",
    },
  },
  indices: [
    { name: "IDX_OPOR_DOCNUM", columns: ["docNum"] },
    { name: "IDX_OPOR_DOCDATE", columns: ["docDate"] },
    { name: "IDX_OPOR_CARDCODE", columns: ["cardCode"] },
    { name: "IDX_OPOR_CARDNAME", columns: ["cardName"] },
  ],
});
