import { faker } from "@faker-js/faker";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { goodsIssueLines } from "@/db/schema/goods-issue-lines";
import { goodsIssues } from "@/db/schema/goods-issues";
import { goodsReceiptLines } from "@/db/schema/goods-receipt-lines";
import { goodsReceipts } from "@/db/schema/goods-receipts";
import { inventoryTransferLines } from "@/db/schema/inventory-transfer-lines";
import { inventoryTransferRequestLines } from "@/db/schema/inventory-transfer-request-lines";
import { inventoryTransferRequests } from "@/db/schema/inventory-transfer-requests";
import { inventoryTransfers } from "@/db/schema/inventory-transfers";

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

export async function seedInventoryDocs(
  db: NodePgDatabase<Record<string, never>>,
  tenant: { prefix: string },
  items: any[],
) {
  // 12. Goods Receipts (20 rows)
  const grHeaders: any[] = [];
  const grLinesSpec: any[] = [];
  for (let i = 1; i <= 20; i += 1) {
    const docDate = getDocDate(i, 20);
    const selectedItems = getRandomItems(items, 2);

    let docTotal = 0;
    const lineItems: any[] = [];
    selectedItems.forEach((item) => {
      const qty = faker.number.int({ max: 50, min: 5 });
      const price = Number.parseFloat(item.avgPrice);
      docTotal += qty * price;
      lineItems.push({ item, price, qty });
    });

    grHeaders.push({
      comments: `Seeded Goods Receipt ${i}`,
      docDate: formatDate(docDate),
      docNum: 50_000 + i,
      docStatus: "C",
      docTotal: docTotal.toString(),
    });
    grLinesSpec.push(lineItems);
  }
  const seededGRs = await db.insert(goodsReceipts).values(grHeaders).returning();

  const grLinesToInsert: any[] = [];
  seededGRs.forEach((gr, index) => {
    const specs = grLinesSpec[index];
    specs.forEach((spec: any, lineIndex: number) => {
      grLinesToInsert.push({
        docEntry: gr.id,
        itemCode: spec.item.code,
        itemDescription: spec.item.name,
        lineNum: lineIndex,
        lineTotal: (spec.qty * spec.price).toString(),
        quantity: spec.qty.toString(),
        unitPrice: spec.price.toString(),
        warehouseCode: `${tenant.prefix}WH-01`,
      });
    });
  });
  if (grLinesToInsert.length > 0) {
    await db.insert(goodsReceiptLines).values(grLinesToInsert);
  }

  // 13. Goods Issues (15 rows)
  const giHeaders: any[] = [];
  const giLinesSpec: any[] = [];
  for (let i = 1; i <= 15; i += 1) {
    const docDate = getDocDate(i, 15);
    const selectedItems = getRandomItems(items, 2);

    let docTotal = 0;
    const lineItems: any[] = [];
    selectedItems.forEach((item) => {
      const qty = faker.number.int({ max: 10, min: 1 });
      const price = Number.parseFloat(item.avgPrice);
      docTotal += qty * price;
      lineItems.push({ item, price, qty });
    });

    giHeaders.push({
      comments: `Seeded Goods Issue ${i}`,
      docDate: formatDate(docDate),
      docNum: 60_000 + i,
      docStatus: "C",
      docTotal: docTotal.toString(),
    });
    giLinesSpec.push(lineItems);
  }
  const seededGIs = await db.insert(goodsIssues).values(giHeaders).returning();

  const giLinesToInsert: any[] = [];
  seededGIs.forEach((gi, index) => {
    const specs = giLinesSpec[index];
    specs.forEach((spec: any, lineIndex: number) => {
      giLinesToInsert.push({
        docEntry: gi.id,
        itemCode: spec.item.code,
        itemDescription: spec.item.name,
        lineNum: lineIndex,
        lineTotal: (spec.qty * spec.price).toString(),
        quantity: spec.qty.toString(),
        unitPrice: spec.price.toString(),
        warehouseCode: `${tenant.prefix}WH-01`,
      });
    });
  });
  if (giLinesToInsert.length > 0) {
    await db.insert(goodsIssueLines).values(giLinesToInsert);
  }

  // 14. Inventory Transfers (20 rows)
  const itHeaders: any[] = [];
  const itLinesSpec: any[] = [];
  for (let i = 1; i <= 20; i += 1) {
    const docDate = getDocDate(i, 20);
    const selectedItems = getRandomItems(items, 2);

    let docTotal = 0;
    const lineItems: any[] = [];
    selectedItems.forEach((item) => {
      const qty = faker.number.int({ max: 15, min: 1 });
      const price = Number.parseFloat(item.avgPrice);
      docTotal += qty * price;
      lineItems.push({ item, price, qty });
    });

    itHeaders.push({
      comments: `Seeded Inventory Transfer ${i}`,
      docDate: formatDate(docDate),
      docNum: 70_000 + i,
      docStatus: "C",
      fromWarehouse: `${tenant.prefix}WH-01`,
      toWarehouse: `${tenant.prefix}WH-02`,
    });
    itLinesSpec.push(lineItems);
  }
  const seededITs = await db.insert(inventoryTransfers).values(itHeaders).returning();

  const itLinesToInsert: any[] = [];
  seededITs.forEach((it, index) => {
    const specs = itLinesSpec[index];
    specs.forEach((spec: any, lineIndex: number) => {
      itLinesToInsert.push({
        docEntry: it.id,
        fromWarehouse: `${tenant.prefix}WH-01`,
        itemCode: spec.item.code,
        itemDescription: spec.item.name,
        lineNum: lineIndex,
        quantity: spec.qty.toString(),
        toWarehouse: `${tenant.prefix}WH-02`,
      });
    });
  });
  if (itLinesToInsert.length > 0) {
    await db.insert(inventoryTransferLines).values(itLinesToInsert);
  }

  // 15. Inventory Transfer Requests (20 rows)
  const itrHeaders: any[] = [];
  const itrLinesSpec: any[] = [];
  for (let i = 1; i <= 20; i += 1) {
    const docDate = getDocDate(i, 20);
    const selectedItems = getRandomItems(items, 2);

    let docTotal = 0;
    const lineItems: any[] = [];
    selectedItems.forEach((item) => {
      const qty = faker.number.int({ max: 15, min: 1 });
      const price = Number.parseFloat(item.avgPrice);
      docTotal += qty * price;
      lineItems.push({ item, price, qty });
    });

    itrHeaders.push({
      comments: `Seeded Inventory Transfer Request ${i}`,
      docDate: formatDate(docDate),
      docDueDate: formatDate(new Date(docDate.getTime() + 7 * 24 * 60 * 60 * 1000)),
      docNum: 80_000 + i,
      docStatus: i % 3 === 0 ? "C" : "O",
      fromWarehouse: `${tenant.prefix}WH-01`,
      toWarehouse: `${tenant.prefix}WH-02`,
    });
    itrLinesSpec.push(lineItems);
  }
  const seededITRs = await db.insert(inventoryTransferRequests).values(itrHeaders).returning();

  const itrLinesToInsert: any[] = [];
  seededITRs.forEach((itr, index) => {
    const specs = itrLinesSpec[index];
    specs.forEach((spec: any, lineIndex: number) => {
      itrLinesToInsert.push({
        docEntry: itr.id,
        fromWarehouse: `${tenant.prefix}WH-01`,
        itemCode: spec.item.code,
        itemDescription: spec.item.name,
        lineNum: lineIndex,
        quantity: spec.qty.toString(),
        toWarehouse: `${tenant.prefix}WH-02`,
      });
    });
  });
  if (itrLinesToInsert.length > 0) {
    await db.insert(inventoryTransferRequestLines).values(itrLinesToInsert);
  }
}
