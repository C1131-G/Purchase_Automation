import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type ItemPrice = {
  ItemCode: string;
  PriceList: number;
  Price?: number;
};

export const ItemPriceSchema = new EntitySchema<ItemPrice>({
  name: "ItemPrice",
  tableName: "ITM1",
  columns: {
    ItemCode: { primary: true, type: "nvarchar" as HANAColumnType, length: 50, name: "ItemCode" },
    PriceList: { primary: true, type: "int" as HANAColumnType, name: "PriceList" },
    Price: {
      type: "decimal" as HANAColumnType,
      precision: 19,
      scale: 6,
      name: "Price",
      nullable: true,
    },
  },
});
