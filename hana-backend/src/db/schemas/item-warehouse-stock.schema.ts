import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export interface ItemWarehouseStock {
  ItemCode: string;
  WhsCode: string;
  OnHand?: number;
}

export const ItemWarehouseStockSchema = new EntitySchema<ItemWarehouseStock>({
  columns: {
    ItemCode: {
      length: 50,
      name: "ItemCode",
      primary: true,
      type: "nvarchar" as HANAColumnType,
    },
    OnHand: {
      name: "OnHand",
      nullable: true,
      precision: 19,
      scale: 6,
      type: "decimal" as HANAColumnType,
    },
    WhsCode: {
      length: 50,
      name: "WhsCode",
      primary: true,
      type: "nvarchar" as HANAColumnType,
    },
  },
  name: "ItemWarehouseStock",
  tableName: "OITW",
});
