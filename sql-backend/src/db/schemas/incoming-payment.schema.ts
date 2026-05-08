import { EntitySchema } from "typeorm";

export interface IncomingPayment {
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

export const IncomingPaymentSchema = new EntitySchema<IncomingPayment>({
  columns: {
    cardCode: { length: 15, name: "CardCode", type: "nvarchar" },
    cardName: { length: 100, name: "CardName", type: "nvarchar" },
    comments: { length: 500, nullable: true, type: "nvarchar" },
    docCurr: { length: 3, name: "DocCur", type: "nvarchar" },
    docDate: { name: "DocDate", type: "date" },
    docEntry: { name: "DocEntry", primary: true, type: "int" },
    docNum: { name: "DocNum", type: "int" },
    docStatus: { length: 1, name: "DocStatus", type: "nvarchar" },
    docTotal: { name: "DocTotal", precision: 19, scale: 6, type: "decimal" },
  },
  name: "IncomingPayment",
  tableName: "RCT1",
});
