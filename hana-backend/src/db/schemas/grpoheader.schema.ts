// GRPOHeader Schema: Maps to SAP B1 GRPO line items table.
// Used to calculate remaining open quantities on source PO lines.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface GRPOHeaderLine {
  docEntry: number; // Header DocEntry (links to OPDN).
  lineNum: number; // Line number within the GRPO.
  itemCode: string;
  quantity: number; // Quantity received in this GRPO line.
  baseEntry: number; // Source PO DocEntry.
  baseLine: number; // Source PO line LineNum.
  baseType: number; // 22 = Purchase Order.
}

export const GRPOHeaderSchema = new EntitySchema<GRPOHeaderLine>({
  columns: {
    baseEntry: { name: "BaseEntry", type: "int" as HANAColumnType },
    baseLine: { name: "BaseLine", type: "int" as HANAColumnType },
    baseType: { name: "BaseType", type: "int" as HANAColumnType },
    docEntry: {
      name: "DocEntry",
      primary: true,
      type: "int" as HANAColumnType,
    },
    itemCode: {
      length: 50,
      name: "ItemCode",
      type: "nvarchar" as HANAColumnType,
    },
    lineNum: { name: "LineNum", primary: true, type: "int" as HANAColumnType },
    quantity: {
      name: "Quantity",
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
  },
  indices: [
    {
      columns: ["baseEntry", "baseLine", "baseType"],
      name: "IDX_GRPOHEADER_BASE",
    },
  ],
  name: "GRPOHeader",
  tableName: "PDN1",
});
