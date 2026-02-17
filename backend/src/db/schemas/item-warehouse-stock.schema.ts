import { EntitySchema } from "typeorm";

import type { HANAColumnType } from "@/db/schemas/types/base.types";

export type ItemWarehouseStock = {
  ItemCode: string;
  WhsCode: string;
  OnHand?: number;
};

export const ItemWarehouseStockSchema = new EntitySchema<ItemWarehouseStock>({
  name: "ItemWarehouseStock",
  tableName: "OITW",
  columns: {
    ItemCode: { primary: true, type: "nvarchar" as HANAColumnType, length: 50, name: "ItemCode" },
    WhsCode: { primary: true, type: "nvarchar" as HANAColumnType, length: 50, name: "WhsCode" },
    OnHand: {
      type: "decimal" as HANAColumnType,
      precision: 19,
      scale: 6,
      name: "OnHand",
      nullable: true,
    },
  },
});
