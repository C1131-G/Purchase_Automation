// PDN1 Schema: Maps to SAP B1 GRPO line items table.
// Used to calculate remaining open quantities on source PO lines.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type PDN1Line = {
  docEntry: number; // Header DocEntry (links to OPDN).
  lineNum: number; // Line number within the GRPO.
  itemCode: string;
  quantity: number; // Quantity received in this GRPO line.
  baseEntry: number; // Source PO DocEntry.
  baseLine: number; // Source PO line LineNum.
  baseType: number; // 22 = Purchase Order.
};

export const PDN1Schema = new EntitySchema<PDN1Line>({
  name: "PDN1",
  tableName: "PDN1",
  columns: {
    // Composite primary key: DocEntry + LineNum uniquely identifies each GRPO line.
    docEntry: { primary: true, type: "int" as HANAColumnType, name: "DocEntry" },
    lineNum: { primary: true, type: "int" as HANAColumnType, name: "LineNum" },
    itemCode: { type: "nvarchar" as HANAColumnType, length: 50, name: "ItemCode" },
    quantity: { type: "decimal" as HANAColumnType, precision: 19, scale: 6, name: "Quantity" },
    baseEntry: { type: "int" as HANAColumnType, name: "BaseEntry" },
    baseLine: { type: "int" as HANAColumnType, name: "BaseLine" },
    baseType: { type: "int" as HANAColumnType, name: "BaseType" },
  },
  indices: [{ name: "IDX_PDN1_BASE", columns: ["baseEntry", "baseLine", "baseType"] }],
});
