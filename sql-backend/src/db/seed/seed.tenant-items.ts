import { faker } from "@faker-js/faker";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { itemPrices } from "@/db/schema/item-prices";
import { itemWarehouseStock } from "@/db/schema/item-warehouse-stock";
import { items } from "@/db/schema/items";

const formatDate = (date: Date): string => date.toISOString().split("T")[0];

export async function seedTenantItems(
  db: NodePgDatabase<Record<string, never>>,
  tenant: { prefix: string },
) {
  const itemValues: any[] = [];
  const ipValues: any[] = [];
  const stockValues: any[] = [];

  for (let i = 1; i <= 30; i += 1) {
    const code = `${tenant.prefix}ITEM-${String(i).padStart(3, "0")}`;
    const name = faker.commerce.productName();
    const avgPrice = Number.parseFloat(faker.commerce.price({ max: 200, min: 10 }));
    const lastPrice = Number.parseFloat((avgPrice * 0.95).toFixed(2));

    itemValues.push({
      avgPrice: avgPrice.toString(),
      barcode: faker.commerce.isbn(),
      code,
      defaultWarehouse: `${tenant.prefix}WH-01`,
      foreignName: faker.commerce.productMaterial(),
      frozen: false,
      inventoryItem: true,
      inventoryUom: "Each",
      itemGroupCode: faker.number.int({ max: 105, min: 100 }),
      lastPurchaseDate: formatDate(faker.date.past({ years: 1 })),
      lastPurchasePrice: lastPrice.toString(),
      name,
      purchaseItem: true,
      salesItem: true,
    });

    ipValues.push(
      { itemCode: code, price: (avgPrice * 1.2).toFixed(2), priceList: 1 },
      { itemCode: code, price: lastPrice.toFixed(2), priceList: 2 },
    );

    const stockQty1 =
      i <= 2 ? faker.number.int({ max: 9, min: 1 }) : faker.number.int({ max: 500, min: 15 });
    const stockQty2 = faker.number.int({ max: 150, min: 0 });
    const stockQty3 = faker.number.int({ max: 50, min: 0 });

    stockValues.push(
      {
        itemCode: code,
        onHand: stockQty1.toString(),
        warehouseCode: `${tenant.prefix}WH-01`,
      },
      {
        itemCode: code,
        onHand: stockQty2.toString(),
        warehouseCode: `${tenant.prefix}WH-02`,
      },
      {
        itemCode: code,
        onHand: stockQty3.toString(),
        warehouseCode: `${tenant.prefix}WH-03`,
      },
    );
  }

  await db.insert(items).values(itemValues);
  await db.insert(itemPrices).values(ipValues);
  await db.insert(itemWarehouseStock).values(stockValues);

  return itemValues;
}
