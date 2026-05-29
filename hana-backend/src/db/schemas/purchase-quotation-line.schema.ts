// Purchase Quotation Line Schema: Maps to the native SAP B1 'PQT1' table.

import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface PurchaseQuotationLine {
  docEntry: number;
  lineNum: number;
  itemCode: string;
  dscription: string;
  quantity: number;
  openQty: number;
  price: number;
  priceBefDi: number;
  vatGroup: string;
  vatPrcnt: number;
  whsCode: string;
  uomCode: string;
  uomEntry: number;
  discPrcnt: number;
  lineTotal: number;
}

export const PurchaseQuotationLineSchema = new EntitySchema<PurchaseQuotationLine>({
  columns: {
    docEntry: {
      name: "DocEntry",
      primary: true,
      type: "int" as HANAColumnType,
    },
    lineNum: {
      name: "LineNum",
      primary: true,
      type: "int" as HANAColumnType,
    },
    itemCode: {
      length: 50,
      name: "ItemCode",
      type: "nvarchar" as HANAColumnType,
    },
    dscription: {
      length: 100,
      name: "Dscription",
      type: "nvarchar" as HANAColumnType,
    },
    quantity: {
      name: "Quantity",
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
    openQty: {
      name: "OpenQty",
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
    price: {
      name: "Price",
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
    priceBefDi: {
      name: "PriceBefDi",
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
    vatGroup: {
      length: 8,
      name: "VatGroup",
      type: "nvarchar" as HANAColumnType,
    },
    vatPrcnt: {
      name: "VatPrcnt",
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
    whsCode: {
      length: 8,
      name: "WhsCode",
      type: "nvarchar" as HANAColumnType,
    },
    uomCode: {
      length: 20,
      name: "UomCode",
      type: "nvarchar" as HANAColumnType,
    },
    uomEntry: {
      name: "UomEntry",
      type: "int" as HANAColumnType,
      nullable: true,
    },
    discPrcnt: {
      name: "DiscPrcnt",
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
    lineTotal: {
      name: "LineTotal",
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
  },
  indices: [{ columns: ["docEntry"], name: "IDX_PQT1_DOCENTRY" }],
  name: "PurchaseQuotationLine",
  tableName: "PQT1",
});
