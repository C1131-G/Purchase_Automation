// APCreditMemoHeader Schema: Maps to SAP B1 AP Credit Memo line items table.
// Used to calculate remaining open quantities on source AP Invoice lines.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface APCreditMemoHeaderLine {
  docEntry: number; // Header DocEntry (links to ORPC).
  lineNum: number; // Line number within the AP Credit Memo.
  itemCode: string;
  quantity: number; // Quantity credited.
  baseEntry: number; // Source AP Invoice DocEntry.
  baseLine: number; // Source AP Invoice line LineNum.
  baseType: number; // 18 = AP Invoice.
}

export const APCreditMemoHeaderSchema = new EntitySchema<APCreditMemoHeaderLine>({
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
    lineNum: {
      name: "LineNum",
      primary: true,
      type: "int" as HANAColumnType,
    },
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
      name: "IDX_APCREDITMEMOHEADER_BASE",
    },
  ],
  name: "APCreditMemoHeader",
  tableName: "RPC1",
});
