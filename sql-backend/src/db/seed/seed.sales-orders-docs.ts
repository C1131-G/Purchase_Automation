import { faker } from "@faker-js/faker";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { salesOrderLines } from "@/db/schema/sales-order-lines";
import { salesOrders } from "@/db/schema/sales-orders";
import { salesQuotationLines } from "@/db/schema/sales-quotation-lines";
import { salesQuotations } from "@/db/schema/sales-quotations";

import { formatSeedDate, getSeedDocDate, pickRandomItems } from "./seed.date-helpers";

export async function seedSalesQuotationAndOrderDocs(
  db: NodePgDatabase<Record<string, never>>,
  tenant: { prefix: string },
  seedCurrency: string,
  bpCustomers: any[],
  items: any[],
) {
  const sqHeaders: any[] = [];
  const sqLinesSpec: any[] = [];
  for (let i = 1; i <= 120; i += 1) {
    const bp = bpCustomers[i % bpCustomers.length];
    const docDate = getSeedDocDate(i, 120);
    const selectedItems = pickRandomItems(items, 2);

    let docTotal = 0;
    const lineItems: any[] = [];
    selectedItems.forEach((item) => {
      const qty = faker.number.int({ max: 20, min: 1 });
      const price = Number.parseFloat(item.avgPrice) * 1.25;
      docTotal += qty * price;
      lineItems.push({ item, price, qty });
    });

    sqHeaders.push({
      address: bp.billToAddress,
      cardCode: bp.code,
      cardName: bp.name,
      comments: `Seeded sales quotation ${i}`,
      docCurrency: seedCurrency,
      docDate: formatSeedDate(docDate),
      docDueDate: formatSeedDate(new Date(docDate.getTime() + 14 * 24 * 60 * 60 * 1000)),
      docNum: 30_000 + i,
      docStatus: i % 2 === 0 ? "O" : "C",
      docTotal: docTotal.toString(),
    });
    sqLinesSpec.push(lineItems);
  }
  const seededSQs = await db.insert(salesQuotations).values(sqHeaders).returning();

  const sqLinesToInsert: any[] = [];
  seededSQs.forEach((sq, index) => {
    sqLinesSpec[index].forEach((spec: any, lineIndex: number) => {
      sqLinesToInsert.push({
        docEntry: sq.id,
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
  if (sqLinesToInsert.length > 0) {
    await db.insert(salesQuotationLines).values(sqLinesToInsert);
  }

  const soHeaders: any[] = [];
  const soLinesSpec: any[] = [];
  for (let i = 1; i <= 150; i += 1) {
    const bp = bpCustomers[i % bpCustomers.length];
    const docDate = getSeedDocDate(i, 150);
    const selectedItems = pickRandomItems(items, 2);

    let docTotal = 0;
    const lineItems: any[] = [];
    selectedItems.forEach((item) => {
      const qty = faker.number.int({ max: 20, min: 1 });
      const price = Number.parseFloat(item.avgPrice) * 1.25;
      docTotal += qty * price;
      lineItems.push({ item, price, qty });
    });

    soHeaders.push({
      address: bp.billToAddress,
      cardCode: bp.code,
      cardName: bp.name,
      comments: `Seeded sales order ${i}`,
      docCurrency: seedCurrency,
      docDate: formatSeedDate(docDate),
      docDueDate: formatSeedDate(new Date(docDate.getTime() + 14 * 24 * 60 * 60 * 1000)),
      docNum: 30_000 + i,
      docStatus: i % 15 === 0 ? "D" : i % 20 === 0 ? "C" : "O",
      docTotal: docTotal.toString(),
    });
    soLinesSpec.push(lineItems);
  }
  const seededSOs = await db.insert(salesOrders).values(soHeaders).returning();
  const soEntries = seededSOs.map((so) => so.id);

  const soLinesToInsert: any[] = [];
  seededSOs.forEach((so, index) => {
    soLinesSpec[index].forEach((spec: any, lineIndex: number) => {
      soLinesToInsert.push({
        docEntry: so.id,
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
  if (soLinesToInsert.length > 0) {
    await db.insert(salesOrderLines).values(soLinesToInsert);
  }

  return { soEntries };
}
