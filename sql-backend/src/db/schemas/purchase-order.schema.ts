import { EntitySchema } from "typeorm";

export interface PurchaseOrder {
  docEntry: number;
  docNum: number;
  docDate: Date;
  cardCode: string;
  cardName: string;
  docTotal: number;
  docCurr: string;
  docStatus: string;
  comments?: string;
}

export const PurchaseOrderSchema = new EntitySchema<PurchaseOrder>({
  columns: {
    cardCode: {
      length: 15,
      name: "CardCode",
      type: "nvarchar",
    },
    cardName: {
      length: 100,
      name: "CardName",
      type: "nvarchar",
    },
    comments: {
      length: 500,
      nullable: true,
      type: "nvarchar",
    },
    docCurr: {
      length: 3,
      name: "DocCur",
      type: "nvarchar",
    },
    docDate: {
      name: "DocDate",
      type: "date",
    },
    docEntry: {
      name: "DocEntry",
      primary: true,
      type: "int",
    },
    docNum: {
      name: "DocNum",
      type: "int",
    },
    docStatus: {
      length: 1,
      name: "DocStatus",
      type: "nvarchar",
    },
    docTotal: {
      name: "DocTotal",
      precision: 19,
      scale: 6,
      type: "decimal",
    },
  },
  indices: [
    { columns: ["docNum"], name: "IDX_POR1_DOCNUM" },
    { columns: ["docDate"], name: "IDX_POR1_DOCDATE" },
    { columns: ["cardCode"], name: "IDX_POR1_CARDCODE" },
  ],
  name: "PurchaseOrder",
  tableName: "POR1",
});
