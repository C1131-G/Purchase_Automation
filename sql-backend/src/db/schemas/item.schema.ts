import { EntitySchema } from "typeorm";

export interface Item {
  itemCode: string;
  itemName: string;
  itemType?: string;
  barcode?: string;
  unitPrice?: number;
}

export const ItemSchema = new EntitySchema<Item>({
  columns: {
    barcode: { length: 20, nullable: true, type: "nvarchar" },
    itemCode: { length: 20, name: "ItemCode", primary: true, type: "nvarchar" },
    itemName: { length: 100, name: "ItemName", type: "nvarchar" },
    itemType: { length: 1, name: "ItemType", nullable: true, type: "nvarchar" },
    unitPrice: {
      name: "UnitPrice",
      nullable: true,
      precision: 19,
      scale: 6,
      type: "decimal",
    },
  },
  name: "Item",
  tableName: "OITM",
});
