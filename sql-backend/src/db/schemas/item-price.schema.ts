import { EntitySchema } from "typeorm";

export interface ItemPrice {
  itemCode: string;
  priceList: number;
  price: number;
  currency?: string;
}

export const ItemPriceSchema = new EntitySchema<ItemPrice>({
  columns: {
    currency: {
      length: 10,
      name: "Currency",
      nullable: true,
      type: "nvarchar",
    },
    itemCode: { length: 50, name: "ItemCode", primary: true, type: "nvarchar" },
    price: { name: "Price", precision: 19, scale: 6, type: "decimal" },
    priceList: { name: "PriceList", primary: true, type: "int" },
  },
  name: "ItemPrice",
  tableName: "ITM1",
});
