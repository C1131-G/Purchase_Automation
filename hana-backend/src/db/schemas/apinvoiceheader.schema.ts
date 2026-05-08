// APInvoiceHeader Schema: Maps to SAP B1 AP Invoice line items table.
// Used to calculate remaining open quantities on source GRPO lines.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface APInvoiceHeaderLine {
  docEntry: number; // Header DocEntry (links to OPCH).
  lineNum: number; // Line number within the AP Invoice.
  itemCode: string;
  quantity: number; // Quantity invoiced.
  baseEntry: number; // Source GRPO DocEntry.
  baseLine: number; // Source GRPO line LineNum.
  baseType: number; // 20 = GRPO.
}

export const APInvoiceHeaderSchema = new EntitySchema<APInvoiceHeaderLine>({
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
      name: "IDX_APINVOICEHEADER_BASE",
    },
  ],
  name: "APInvoiceHeader",
  tableName: "PCH1",
});
