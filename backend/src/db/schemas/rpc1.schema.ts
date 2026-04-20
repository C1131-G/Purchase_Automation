// RPC1 Schema: Maps to SAP B1 AP Credit Memo line items table.
// Used to calculate remaining open quantities on source AP Invoice lines.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type RPC1Line = {
  docEntry: number; // Header DocEntry (links to ORPC).
  lineNum: number; // Line number within the AP Credit Memo.
  itemCode: string;
  quantity: number; // Quantity credited.
  baseEntry: number; // Source AP Invoice DocEntry.
  baseLine: number; // Source AP Invoice line LineNum.
  baseType: number; // 18 = AP Invoice.
};

export const RPC1Schema = new EntitySchema<RPC1Line>({
  name: "RPC1",
  tableName: "RPC1",
  columns: {
    // Composite primary key: DocEntry + LineNum uniquely identifies each AP Credit Memo line.
    docEntry: { primary: true, type: "int" as HANAColumnType, name: "DocEntry" },
    lineNum: { primary: true, type: "int" as HANAColumnType, name: "LineNum" },
    itemCode: { type: "nvarchar" as HANAColumnType, length: 50, name: "ItemCode" },
    quantity: { type: "decimal" as HANAColumnType, precision: 19, scale: 6, name: "Quantity" },
    baseEntry: { type: "int" as HANAColumnType, name: "BaseEntry" },
    baseLine: { type: "int" as HANAColumnType, name: "BaseLine" },
    baseType: { type: "int" as HANAColumnType, name: "BaseType" },
  },
  indices: [{ name: "IDX_RPC1_BASE", columns: ["baseEntry", "baseLine", "baseType"] }],
});
