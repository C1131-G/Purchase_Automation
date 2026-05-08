import { EntitySchema } from "typeorm";

export interface ItemWarehouseStock {
  itemCode: string;
  warehouseCode: string;
  onHand: number;
  committed: number;
  ordered: number;
  available: number;
}

export const ItemWarehouseStockSchema = new EntitySchema<ItemWarehouseStock>({
  columns: {
    available: { name: "OnHand", precision: 19, scale: 6, type: "decimal" },
    committed: { name: "Committed", precision: 19, scale: 6, type: "decimal" },
    itemCode: { length: 50, name: "ItemCode", primary: true, type: "nvarchar" },
    onHand: { name: "OnHand", precision: 19, scale: 6, type: "decimal" },
    ordered: { name: "Ordered", precision: 19, scale: 6, type: "decimal" },
    warehouseCode: {
      length: 50,
      name: "WhsCode",
      primary: true,
      type: "nvarchar",
    },
  },
  name: "ItemWarehouseStock",
  tableName: "OITW",
});
