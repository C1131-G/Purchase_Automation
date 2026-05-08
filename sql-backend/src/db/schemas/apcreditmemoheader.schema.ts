import { EntitySchema } from "typeorm";

export interface APCreditMemoHeaderLine {
  docEntry: number;
  lineNum: number;
  baseType?: number;
  baseEntry?: number;
  baseLine?: number;
  itemCode?: string;
  itemDescription?: string;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
  uomCode?: string;
  whsCode?: string;
}

export const APCreditMemoHeaderSchema = new EntitySchema<APCreditMemoHeaderLine>({
  columns: {
    baseEntry: { name: "BaseEntry", nullable: true, type: "int" },
    baseLine: { name: "BaseLine", nullable: true, type: "int" },
    baseType: { name: "BaseType", nullable: true, type: "int" },
    docEntry: { name: "DocEntry", primary: true, type: "int" },
    itemCode: {
      length: 50,
      name: "ItemCode",
      nullable: true,
      type: "nvarchar",
    },
    itemDescription: {
      length: 200,
      name: "Dscription",
      nullable: true,
      type: "nvarchar",
    },
    lineNum: { name: "LineNum", primary: true, type: "int" },
    lineTotal: {
      name: "LineTotal",
      nullable: true,
      precision: 19,
      scale: 6,
      type: "decimal",
    },
    quantity: {
      name: "Quantity",
      nullable: true,
      precision: 19,
      scale: 6,
      type: "decimal",
    },
    unitPrice: {
      name: "Price",
      nullable: true,
      precision: 19,
      scale: 6,
      type: "decimal",
    },
    uomCode: {
      length: 20,
      name: "UnitMsr",
      nullable: true,
      type: "nvarchar",
    },
    whsCode: {
      length: 50,
      name: "WhsCode",
      nullable: true,
      type: "nvarchar",
    },
  },
  name: "APCreditMemoHeader",
  tableName: "RPC1",
});
