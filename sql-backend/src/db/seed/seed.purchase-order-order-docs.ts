import { faker } from "@faker-js/faker";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { purchaseOrderLines } from "@/db/schema/purchase-order-lines";
import { purchaseOrders } from "@/db/schema/purchase-orders";
import { purchaseQuotationLines } from "@/db/schema/purchase-quotation-lines";
import { purchaseQuotations } from "@/db/schema/purchase-quotations";

const formatDate = (date: Date): string => date.toISOString().split("T")[0];

const getDocDate = (index: number, total: number) => {
  const daysAgo = Math.floor((index / total) * 365);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

const getRandomItems = (items: any[], count: number) => {
  const shuffled = [...items].toSorted(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export async function seedPurchaseQuotationsAndOrders(
  db: NodePgDatabase<Record<string, never>>,
  tenant: { prefix: string },
  seedCurrency: string,
  bpVendors: any[],
  items: any[],
) {
  // 1. Purchase Quotations (100 rows)
  const pqHeaders: any[] = [];
  const pqLinesSpec: any[] = [];
  for (let i = 1; i <= 100; i += 1) {
    const bp = bpVendors[i % bpVendors.length];
    const docDate = getDocDate(i, 100);
    const selectedItems = getRandomItems(items, 2);

    let docTotal = 0;
    const lineItems: any[] = [];
    selectedItems.forEach((item) => {
      const qty = faker.number.int({ max: 20, min: 1 });
      const price = Number.parseFloat(item.lastPurchasePrice);
      docTotal += qty * price;
      lineItems.push({ item, price, qty });
    });

    pqHeaders.push({
      address: bp.billToAddress,
      cardCode: bp.code,
      cardName: bp.name,
      comments: `Seeded purchase quotation ${i}`,
      docCurrency: seedCurrency,
      docDate: formatDate(docDate),
      docDueDate: formatDate(new Date(docDate.getTime() + 14 * 24 * 60 * 60 * 1000)),
      docNum: 10_000 + i,
      docStatus: i % 2 === 0 ? "O" : "C",
      docTotal: docTotal.toString(),
    });
    pqLinesSpec.push(lineItems);
  }
  const seededPQs = await db.insert(purchaseQuotations).values(pqHeaders).returning();

  const pqLinesToInsert: any[] = [];
  seededPQs.forEach((pq, index) => {
    const specs = pqLinesSpec[index];
    specs.forEach((spec: any, lineIndex: number) => {
      pqLinesToInsert.push({
        docEntry: pq.id,
        itemCode: spec.item.code,
        itemDescription: spec.item.name,
        lineNum: lineIndex,
        lineTotal: (spec.qty * spec.price).toString(),
        quantity: spec.qty.toString(),
        unitPrice: spec.price.toString(),
        uomCode: "Each",
        uomEntry: 1,
        warehouseCode: `${tenant.prefix}WH-01`,
      });
    });
  });
  if (pqLinesToInsert.length > 0) {
    await db.insert(purchaseQuotationLines).values(pqLinesToInsert);
  }

  // 2. Purchase Orders (150 rows)
  const poHeaders: any[] = [];
  const poLinesSpec: any[] = [];
  for (let i = 1; i <= 150; i += 1) {
    const bp = bpVendors[i % bpVendors.length];
    const docDate = getDocDate(i, 150);
    const selectedItems = getRandomItems(items, 2);

    let docTotal = 0;
    const lineItems: any[] = [];
    selectedItems.forEach((item) => {
      const qty = faker.number.int({ max: 20, min: 1 });
      const price = Number.parseFloat(item.lastPurchasePrice);
      docTotal += qty * price;
      lineItems.push({ item, price, qty });
    });

    poHeaders.push({
      address: bp.billToAddress,
      cardCode: bp.code,
      cardName: bp.name,
      comments: `Seeded purchase order ${i}`,
      docCurrency: seedCurrency,
      docDate: formatDate(docDate),
      docDueDate: formatDate(new Date(docDate.getTime() + 14 * 24 * 60 * 60 * 1000)),
      docNum: 10_000 + i,
      docStatus: i % 15 === 0 ? "D" : i % 20 === 0 ? "C" : "O",
      docTotal: docTotal.toString(),
    });
    poLinesSpec.push(lineItems);
  }
  const seededPOs = await db.insert(purchaseOrders).values(poHeaders).returning();
  const poEntries = seededPOs.map((po) => po.id);

  const poLinesToInsert: any[] = [];
  seededPOs.forEach((po, index) => {
    const specs = poLinesSpec[index];
    specs.forEach((spec: any, lineIndex: number) => {
      poLinesToInsert.push({
        docEntry: po.id,
        itemCode: spec.item.code,
        itemDescription: spec.item.name,
        lineNum: lineIndex,
        lineTotal: (spec.qty * spec.price).toString(),
        quantity: spec.qty.toString(),
        unitPrice: spec.price.toString(),
        uomCode: "Each",
        uomEntry: 1,
        warehouseCode: `${tenant.prefix}WH-01`,
      });
    });
  });
  if (poLinesToInsert.length > 0) {
    await db.insert(purchaseOrderLines).values(poLinesToInsert);
  }

  return poEntries;
}
