// PCH1 Schema: Maps to SAP B1 AP Invoice line items table.
// Used to calculate remaining open quantities on source GRPO lines.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type PCH1Line = {
  docEntry: number; // Header DocEntry (links to OPCH).
  lineNum: number; // Line number within the AP Invoice.
  itemCode: string;
  quantity: number; // Quantity invoiced.
  baseEntry: number; // Source GRPO DocEntry.
  baseLine: number; // Source GRPO line LineNum.
  baseType: number; // 20 = GRPO.
};

export const PCH1Schema = new EntitySchema<PCH1Line>({
  name: "PCH1",
  tableName: "PCH1",
  columns: {
    docEntry: { type: "int" as HANAColumnType, name: "DocEntry" },
    lineNum: { type: "int" as HANAColumnType, name: "LineNum" },
    itemCode: { type: "nvarchar" as HANAColumnType, length: 50, name: "ItemCode" },
    quantity: { type: "decimal" as HANAColumnType, precision: 19, scale: 6, name: "Quantity" },
    baseEntry: { type: "int" as HANAColumnType, name: "BaseEntry" },
    baseLine: { type: "int" as HANAColumnType, name: "BaseLine" },
    baseType: { type: "int" as HANAColumnType, name: "BaseType" },
  },
  indices: [{ name: "IDX_PCH1_BASE", columns: ["baseEntry", "baseLine", "baseType"] }],
});
