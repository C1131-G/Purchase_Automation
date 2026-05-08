import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface ItemPrice {
  ItemCode: string;
  PriceList: number;
  Price?: number;
}

export const ItemPriceSchema = new EntitySchema<ItemPrice>({
  columns: {
    ItemCode: {
      length: 50,
      name: "ItemCode",
      primary: true,
      type: "nvarchar" as HANAColumnType,
    },
    Price: {
      name: "Price",
      nullable: true,
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
    PriceList: {
      name: "PriceList",
      primary: true,
      type: "int" as HANAColumnType,
    },
  },
  name: "ItemPrice",
  tableName: "ITM1",
});
