import { eq, and, sql } from "drizzle-orm";
import { purchaseOrders } from "@/db/schema/purchase-orders";
import { purchaseOrderLines } from "@/db/schema/purchase-order-lines";
import { purchaseQuotations } from "@/db/schema/purchase-quotations";
import { purchaseQuotationLines } from "@/db/schema/purchase-quotation-lines";
import { grpo } from "@/db/schema/grpo";
import { grpoLines } from "@/db/schema/grpo-lines";
import { apInvoices } from "@/db/schema/ap-invoices";
import { apInvoiceLines } from "@/db/schema/ap-invoice-lines";
import { apCreditMemos } from "@/db/schema/ap-credit-memos";
import { apCreditMemoLines } from "@/db/schema/ap-credit-memo-lines";
import { salesQuotations } from "@/db/schema/sales-quotations";
import { salesQuotationLines } from "@/db/schema/sales-quotation-lines";
import { salesOrders } from "@/db/schema/sales-orders";
import { salesOrderLines } from "@/db/schema/sales-order-lines";
import { arInvoices } from "@/db/schema/ar-invoices";
import { arInvoiceLines } from "@/db/schema/ar-invoice-lines";
import { arCreditMemos } from "@/db/schema/ar-credit-memos";
import { arCreditMemoLines } from "@/db/schema/ar-credit-memo-lines";
import { AppError } from "@/core/errors/app-error";

export async function calculateOpenQty(
  db: any,
  baseType: number,
  baseEntry: number,
  baseLine: number,
  originalQty: number,
  excludeChildDocId?: number,
  excludeChildDocType?: number,
): Promise<number> {
  const childQueries: Promise<number>[] = [];

  // 1. PO Lines (Child of PQ: 540000006)
  if (baseType === 540000006) {
    childQueries.push(
      (async () => {
        const exclude = excludeChildDocType === 22 && excludeChildDocId;
        const condition = exclude
          ? and(
              eq(purchaseOrderLines.baseType, baseType),
              eq(purchaseOrderLines.baseEntry, baseEntry),
              eq(purchaseOrderLines.baseLine, baseLine),
              sql`${purchaseOrders.docStatus} <> 'D'`,
              sql`COALESCE(${purchaseOrders.canceled}, 'N') <> 'Y'`,
              sql`${purchaseOrderLines.docEntry} <> ${excludeChildDocId}`,
            )
          : and(
              eq(purchaseOrderLines.baseType, baseType),
              eq(purchaseOrderLines.baseEntry, baseEntry),
              eq(purchaseOrderLines.baseLine, baseLine),
              sql`${purchaseOrders.docStatus} <> 'D'`,
              sql`COALESCE(${purchaseOrders.canceled}, 'N') <> 'Y'`,
            );

        const rows = await db
          .select({ quantity: purchaseOrderLines.quantity })
          .from(purchaseOrderLines)
          .innerJoin(purchaseOrders, eq(purchaseOrders.id, purchaseOrderLines.docEntry))
          .where(condition);

        return rows.reduce((sum: number, r: any) => sum + Number(r.quantity || 0), 0);
      })(),
    );
  }

  // 2. GRPO Lines (Child of PO: 22)
  if (baseType === 22) {
    childQueries.push(
      (async () => {
        const exclude = excludeChildDocType === 20 && excludeChildDocId;
        const condition = exclude
          ? and(
              eq(grpoLines.baseType, baseType),
              eq(grpoLines.baseEntry, baseEntry),
              eq(grpoLines.baseLine, baseLine),
              sql`${grpo.docStatus} <> 'D'`,
              sql`COALESCE(${grpo.canceled}, 'N') <> 'Y'`,
              sql`${grpoLines.docEntry} <> ${excludeChildDocId}`,
            )
          : and(
              eq(grpoLines.baseType, baseType),
              eq(grpoLines.baseEntry, baseEntry),
              eq(grpoLines.baseLine, baseLine),
              sql`${grpo.docStatus} <> 'D'`,
              sql`COALESCE(${grpo.canceled}, 'N') <> 'Y'`,
            );

        const rows = await db
          .select({ quantity: grpoLines.quantity })
          .from(grpoLines)
          .innerJoin(grpo, eq(grpo.id, grpoLines.docEntry))
          .where(condition);

        return rows.reduce((sum: number, r: any) => sum + Number(r.quantity || 0), 0);
      })(),
    );
  }

  // 3. AP Invoice Lines (Child of PO: 22 or GRPO: 20)
  if (baseType === 22 || baseType === 20) {
    childQueries.push(
      (async () => {
        const exclude = excludeChildDocType === 18 && excludeChildDocId;
        const condition = exclude
          ? and(
              eq(apInvoiceLines.baseType, baseType),
              eq(apInvoiceLines.baseEntry, baseEntry),
              eq(apInvoiceLines.baseLine, baseLine),
              sql`${apInvoices.docStatus} <> 'D'`,
              sql`COALESCE(${apInvoices.canceled}, 'N') <> 'Y'`,
              sql`${apInvoiceLines.docEntry} <> ${excludeChildDocId}`,
            )
          : and(
              eq(apInvoiceLines.baseType, baseType),
              eq(apInvoiceLines.baseEntry, baseEntry),
              eq(apInvoiceLines.baseLine, baseLine),
              sql`${apInvoices.docStatus} <> 'D'`,
              sql`COALESCE(${apInvoices.canceled}, 'N') <> 'Y'`,
            );

        const rows = await db
          .select({ quantity: apInvoiceLines.quantity })
          .from(apInvoiceLines)
          .innerJoin(apInvoices, eq(apInvoices.id, apInvoiceLines.docEntry))
          .where(condition);

        return rows.reduce((sum: number, r: any) => sum + Number(r.quantity || 0), 0);
      })(),
    );
  }

  // 4. AP Credit Memo Lines (Child of AP Invoice: 18)
  if (baseType === 18) {
    childQueries.push(
      (async () => {
        const exclude = excludeChildDocType === 19 && excludeChildDocId;
        const condition = exclude
          ? and(
              eq(apCreditMemoLines.baseType, baseType),
              eq(apCreditMemoLines.baseEntry, baseEntry),
              eq(apCreditMemoLines.baseLine, baseLine),
              sql`${apCreditMemos.docStatus} <> 'D'`,
              sql`COALESCE(${apCreditMemos.canceled}, 'N') <> 'Y'`,
              sql`${apCreditMemoLines.docEntry} <> ${excludeChildDocId}`,
            )
          : and(
              eq(apCreditMemoLines.baseType, baseType),
              eq(apCreditMemoLines.baseEntry, baseEntry),
              eq(apCreditMemoLines.baseLine, baseLine),
              sql`${apCreditMemos.docStatus} <> 'D'`,
              sql`COALESCE(${apCreditMemos.canceled}, 'N') <> 'Y'`,
            );

        const rows = await db
          .select({ quantity: apCreditMemoLines.quantity })
          .from(apCreditMemoLines)
          .innerJoin(apCreditMemos, eq(apCreditMemos.id, apCreditMemoLines.docEntry))
          .where(condition);

        return rows.reduce((sum: number, r: any) => sum + Number(r.quantity || 0), 0);
      })(),
    );
  }

  // 5. Sales Order Lines (Child of SQ: 23)
  if (baseType === 23) {
    childQueries.push(
      (async () => {
        const exclude = excludeChildDocType === 17 && excludeChildDocId;
        const condition = exclude
          ? and(
              eq(salesOrderLines.baseType, baseType),
              eq(salesOrderLines.baseEntry, baseEntry),
              eq(salesOrderLines.baseLine, baseLine),
              sql`${salesOrders.docStatus} <> 'D'`,
              sql`COALESCE(${salesOrders.canceled}, 'N') <> 'Y'`,
              sql`${salesOrderLines.docEntry} <> ${excludeChildDocId}`,
            )
          : and(
              eq(salesOrderLines.baseType, baseType),
              eq(salesOrderLines.baseEntry, baseEntry),
              eq(salesOrderLines.baseLine, baseLine),
              sql`${salesOrders.docStatus} <> 'D'`,
              sql`COALESCE(${salesOrders.canceled}, 'N') <> 'Y'`,
            );

        const rows = await db
          .select({ quantity: salesOrderLines.quantity })
          .from(salesOrderLines)
          .innerJoin(salesOrders, eq(salesOrders.id, salesOrderLines.docEntry))
          .where(condition);

        return rows.reduce((sum: number, r: any) => sum + Number(r.quantity || 0), 0);
      })(),
    );
  }

  // 6. AR Invoice Lines (Child of SO: 17 or SQ: 23)
  if (baseType === 17 || baseType === 23) {
    childQueries.push(
      (async () => {
        const exclude = excludeChildDocType === 13 && excludeChildDocId;
        const condition = exclude
          ? and(
              eq(arInvoiceLines.baseType, baseType),
              eq(arInvoiceLines.baseEntry, baseEntry),
              eq(arInvoiceLines.baseLine, baseLine),
              sql`${arInvoices.docStatus} <> 'D'`,
              sql`COALESCE(${arInvoices.canceled}, 'N') <> 'Y'`,
              sql`${arInvoiceLines.docEntry} <> ${excludeChildDocId}`,
            )
          : and(
              eq(arInvoiceLines.baseType, baseType),
              eq(arInvoiceLines.baseEntry, baseEntry),
              eq(arInvoiceLines.baseLine, baseLine),
              sql`${arInvoices.docStatus} <> 'D'`,
              sql`COALESCE(${arInvoices.canceled}, 'N') <> 'Y'`,
            );

        const rows = await db
          .select({ quantity: arInvoiceLines.quantity })
          .from(arInvoiceLines)
          .innerJoin(arInvoices, eq(arInvoices.id, arInvoiceLines.docEntry))
          .where(condition);

        return rows.reduce((sum: number, r: any) => sum + Number(r.quantity || 0), 0);
      })(),
    );
  }

  // 7. AR Credit Memo Lines (Child of AR Invoice: 13)
  if (baseType === 13) {
    childQueries.push(
      (async () => {
        const exclude = excludeChildDocType === 16 && excludeChildDocId;
        const condition = exclude
          ? and(
              eq(arCreditMemoLines.baseType, baseType),
              eq(arCreditMemoLines.baseEntry, baseEntry),
              eq(arCreditMemoLines.baseLine, baseLine),
              sql`${arCreditMemos.docStatus} <> 'D'`,
              sql`COALESCE(${arCreditMemos.canceled}, 'N') <> 'Y'`,
              sql`${arCreditMemoLines.docEntry} <> ${excludeChildDocId}`,
            )
          : and(
              eq(arCreditMemoLines.baseType, baseType),
              eq(arCreditMemoLines.baseEntry, baseEntry),
              eq(arCreditMemoLines.baseLine, baseLine),
              sql`${arCreditMemos.docStatus} <> 'D'`,
              sql`COALESCE(${arCreditMemos.canceled}, 'N') <> 'Y'`,
            );

        const rows = await db
          .select({ quantity: arCreditMemoLines.quantity })
          .from(arCreditMemoLines)
          .innerJoin(arCreditMemos, eq(arCreditMemos.id, arCreditMemoLines.docEntry))
          .where(condition);

        return rows.reduce((sum: number, r: any) => sum + Number(r.quantity || 0), 0);
      })(),
    );
  }

  const results = await Promise.all(childQueries);
  const consumedQty = results.reduce((sum, q) => sum + q, 0);

  return Math.max(0, originalQty - consumedQty);
}

export async function validateBaseLinks(
  db: any,
  lines: any[],
  selectedCardCode: string,
  excludeChildDocId?: number,
  excludeChildDocType?: number,
): Promise<void> {
  for (const line of lines) {
    const baseType = Number(line.baseType);
    const baseEntry = Number(line.baseEntry);
    const baseLine = Number(line.baseLine);
    const requestedQty = Number(line.quantity || 0);

    if (!Number.isFinite(baseType) || !Number.isFinite(baseEntry) || !Number.isFinite(baseLine)) {
      continue;
    }

    let parentCardCode = "";
    let parentItemCode = "";
    let parentQuantity = 0;

    if (baseType === 540000006) {
      const [header] = await db
        .select({ cardCode: purchaseQuotations.cardCode })
        .from(purchaseQuotations)
        .where(eq(purchaseQuotations.id, baseEntry))
        .limit(1);
      const [row] = await db
        .select({
          itemCode: purchaseQuotationLines.itemCode,
          quantity: purchaseQuotationLines.quantity,
        })
        .from(purchaseQuotationLines)
        .where(
          and(
            eq(purchaseQuotationLines.docEntry, baseEntry),
            eq(purchaseQuotationLines.lineNum, baseLine),
          ),
        )
        .limit(1);
      if (header) parentCardCode = header.cardCode;
      if (row) {
        parentItemCode = row.itemCode;
        parentQuantity = Number(row.quantity || 0);
      }
    } else if (baseType === 22) {
      const [header] = await db
        .select({ cardCode: purchaseOrders.cardCode })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, baseEntry))
        .limit(1);
      const [row] = await db
        .select({ itemCode: purchaseOrderLines.itemCode, quantity: purchaseOrderLines.quantity })
        .from(purchaseOrderLines)
        .where(
          and(eq(purchaseOrderLines.docEntry, baseEntry), eq(purchaseOrderLines.lineNum, baseLine)),
        )
        .limit(1);
      if (header) parentCardCode = header.cardCode;
      if (row) {
        parentItemCode = row.itemCode;
        parentQuantity = Number(row.quantity || 0);
      }
    } else if (baseType === 20) {
      const [header] = await db
        .select({ cardCode: grpo.cardCode })
        .from(grpo)
        .where(eq(grpo.id, baseEntry))
        .limit(1);
      const [row] = await db
        .select({ itemCode: grpoLines.itemCode, quantity: grpoLines.quantity })
        .from(grpoLines)
        .where(and(eq(grpoLines.docEntry, baseEntry), eq(grpoLines.lineNum, baseLine)))
        .limit(1);
      if (header) parentCardCode = header.cardCode;
      if (row) {
        parentItemCode = row.itemCode;
        parentQuantity = Number(row.quantity || 0);
      }
    } else if (baseType === 18) {
      const [header] = await db
        .select({ cardCode: apInvoices.cardCode })
        .from(apInvoices)
        .where(eq(apInvoices.id, baseEntry))
        .limit(1);
      const [row] = await db
        .select({ itemCode: apInvoiceLines.itemCode, quantity: apInvoiceLines.quantity })
        .from(apInvoiceLines)
        .where(and(eq(apInvoiceLines.docEntry, baseEntry), eq(apInvoiceLines.lineNum, baseLine)))
        .limit(1);
      if (header) parentCardCode = header.cardCode;
      if (row) {
        parentItemCode = row.itemCode;
        parentQuantity = Number(row.quantity || 0);
      }
    } else if (baseType === 23) {
      const [header] = await db
        .select({ cardCode: salesQuotations.cardCode })
        .from(salesQuotations)
        .where(eq(salesQuotations.id, baseEntry))
        .limit(1);
      const [row] = await db
        .select({ itemCode: salesQuotationLines.itemCode, quantity: salesQuotationLines.quantity })
        .from(salesQuotationLines)
        .where(
          and(
            eq(salesQuotationLines.docEntry, baseEntry),
            eq(salesQuotationLines.lineNum, baseLine),
          ),
        )
        .limit(1);
      if (header) parentCardCode = header.cardCode;
      if (row) {
        parentItemCode = row.itemCode;
        parentQuantity = Number(row.quantity || 0);
      }
    } else if (baseType === 17) {
      const [header] = await db
        .select({ cardCode: salesOrders.cardCode })
        .from(salesOrders)
        .where(eq(salesOrders.id, baseEntry))
        .limit(1);
      const [row] = await db
        .select({ itemCode: salesOrderLines.itemCode, quantity: salesOrderLines.quantity })
        .from(salesOrderLines)
        .where(and(eq(salesOrderLines.docEntry, baseEntry), eq(salesOrderLines.lineNum, baseLine)))
        .limit(1);
      if (header) parentCardCode = header.cardCode;
      if (row) {
        parentItemCode = row.itemCode;
        parentQuantity = Number(row.quantity || 0);
      }
    } else if (baseType === 13) {
      const [header] = await db
        .select({ cardCode: arInvoices.cardCode })
        .from(arInvoices)
        .where(eq(arInvoices.id, baseEntry))
        .limit(1);
      const [row] = await db
        .select({ itemCode: arInvoiceLines.itemCode, quantity: arInvoiceLines.quantity })
        .from(arInvoiceLines)
        .where(and(eq(arInvoiceLines.docEntry, baseEntry), eq(arInvoiceLines.lineNum, baseLine)))
        .limit(1);
      if (header) parentCardCode = header.cardCode;
      if (row) {
        parentItemCode = row.itemCode;
        parentQuantity = Number(row.quantity || 0);
      }
    } else {
      throw new AppError(`Unsupported base document type ${baseType}`, 400, "BAD_REQUEST");
    }

    if (!parentItemCode) {
      throw new AppError(
        `Base document line not found for baseEntry ${baseEntry}, baseLine ${baseLine}`,
        400,
        "BAD_REQUEST",
      );
    }

    if (parentCardCode !== selectedCardCode) {
      throw new AppError(
        `Base document cardCode '${parentCardCode}' does not match selected cardCode '${selectedCardCode}'`,
        400,
        "BAD_REQUEST",
      );
    }

    if (parentItemCode !== line.itemCode) {
      throw new AppError(
        `Base document line item code '${parentItemCode}' does not match requested line item code '${line.itemCode}'`,
        400,
        "BAD_REQUEST",
      );
    }

    const openQty = await calculateOpenQty(
      db,
      baseType,
      baseEntry,
      baseLine,
      parentQuantity,
      excludeChildDocId,
      excludeChildDocType,
    );
    if (requestedQty > openQty) {
      throw new AppError(
        `Requested quantity ${requestedQty} exceeds remaining open quantity ${openQty} of base document line`,
        400,
        "BAD_REQUEST",
      );
    }
  }
}

export async function recalculateParentStatuses(
  db: any,
  parentDocEntries: Set<number>,
  parentObjType: number,
): Promise<void> {
  for (const entryId of parentDocEntries) {
    if (parentObjType === 540000006) {
      const lines = await db
        .select()
        .from(purchaseQuotationLines)
        .where(eq(purchaseQuotationLines.docEntry, entryId));
      let allClosed = true;
      for (const line of lines) {
        const openQty = await calculateOpenQty(
          db,
          parentObjType,
          entryId,
          line.lineNum,
          Number(line.quantity || 0),
        );
        if (openQty > 0) {
          allClosed = false;
          break;
        }
      }
      const [header] = await db
        .select({ canceled: purchaseQuotations.canceled })
        .from(purchaseQuotations)
        .where(eq(purchaseQuotations.id, entryId))
        .limit(1);
      if (header && header.canceled !== "Y") {
        await db
          .update(purchaseQuotations)
          .set({ docStatus: allClosed ? "C" : "O" })
          .where(eq(purchaseQuotations.id, entryId));
      }
    } else if (parentObjType === 22) {
      const lines = await db
        .select()
        .from(purchaseOrderLines)
        .where(eq(purchaseOrderLines.docEntry, entryId));
      let allClosed = true;
      for (const line of lines) {
        const openQty = await calculateOpenQty(
          db,
          parentObjType,
          entryId,
          line.lineNum,
          Number(line.quantity || 0),
        );
        if (openQty > 0) {
          allClosed = false;
          break;
        }
      }
      const [header] = await db
        .select({ canceled: purchaseOrders.canceled })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, entryId))
        .limit(1);
      if (header && header.canceled !== "Y") {
        await db
          .update(purchaseOrders)
          .set({ docStatus: allClosed ? "C" : "O" })
          .where(eq(purchaseOrders.id, entryId));
      }
    } else if (parentObjType === 20) {
      const lines = await db.select().from(grpoLines).where(eq(grpoLines.docEntry, entryId));
      let allClosed = true;
      for (const line of lines) {
        const openQty = await calculateOpenQty(
          db,
          parentObjType,
          entryId,
          line.lineNum,
          Number(line.quantity || 0),
        );
        if (openQty > 0) {
          allClosed = false;
          break;
        }
      }
      const [header] = await db
        .select({ canceled: grpo.canceled })
        .from(grpo)
        .where(eq(grpo.id, entryId))
        .limit(1);
      if (header && header.canceled !== "Y") {
        await db
          .update(grpo)
          .set({ docStatus: allClosed ? "C" : "O" })
          .where(eq(grpo.id, entryId));
      }
    } else if (parentObjType === 18) {
      const lines = await db
        .select()
        .from(apInvoiceLines)
        .where(eq(apInvoiceLines.docEntry, entryId));
      let allClosed = true;
      for (const line of lines) {
        const openQty = await calculateOpenQty(
          db,
          parentObjType,
          entryId,
          line.lineNum,
          Number(line.quantity || 0),
        );
        if (openQty > 0) {
          allClosed = false;
          break;
        }
      }
      const [header] = await db
        .select({ canceled: apInvoices.canceled })
        .from(apInvoices)
        .where(eq(apInvoices.id, entryId))
        .limit(1);
      if (header && header.canceled !== "Y") {
        await db
          .update(apInvoices)
          .set({ docStatus: allClosed ? "C" : "O" })
          .where(eq(apInvoices.id, entryId));
      }
    } else if (parentObjType === 23) {
      const lines = await db
        .select()
        .from(salesQuotationLines)
        .where(eq(salesQuotationLines.docEntry, entryId));
      let allClosed = true;
      for (const line of lines) {
        const openQty = await calculateOpenQty(
          db,
          parentObjType,
          entryId,
          line.lineNum,
          Number(line.quantity || 0),
        );
        if (openQty > 0) {
          allClosed = false;
          break;
        }
      }
      const [header] = await db
        .select({ canceled: salesQuotations.canceled })
        .from(salesQuotations)
        .where(eq(salesQuotations.id, entryId))
        .limit(1);
      if (header && header.canceled !== "Y") {
        await db
          .update(salesQuotations)
          .set({ docStatus: allClosed ? "C" : "O" })
          .where(eq(salesQuotations.id, entryId));
      }
    } else if (parentObjType === 17) {
      const lines = await db
        .select()
        .from(salesOrderLines)
        .where(eq(salesOrderLines.docEntry, entryId));
      let allClosed = true;
      for (const line of lines) {
        const openQty = await calculateOpenQty(
          db,
          parentObjType,
          entryId,
          line.lineNum,
          Number(line.quantity || 0),
        );
        if (openQty > 0) {
          allClosed = false;
          break;
        }
      }
      const [header] = await db
        .select({ canceled: salesOrders.canceled })
        .from(salesOrders)
        .where(eq(salesOrders.id, entryId))
        .limit(1);
      if (header && header.canceled !== "Y") {
        await db
          .update(salesOrders)
          .set({ docStatus: allClosed ? "C" : "O" })
          .where(eq(salesOrders.id, entryId));
      }
    } else if (parentObjType === 13) {
      const lines = await db
        .select()
        .from(arInvoiceLines)
        .where(eq(arInvoiceLines.docEntry, entryId));
      let allClosed = true;
      for (const line of lines) {
        const openQty = await calculateOpenQty(
          db,
          parentObjType,
          entryId,
          line.lineNum,
          Number(line.quantity || 0),
        );
        if (openQty > 0) {
          allClosed = false;
          break;
        }
      }
      const [header] = await db
        .select({ canceled: arInvoices.canceled })
        .from(arInvoices)
        .where(eq(arInvoices.id, entryId))
        .limit(1);
      if (header && header.canceled !== "Y") {
        await db
          .update(arInvoices)
          .set({ docStatus: allClosed ? "C" : "O" })
          .where(eq(arInvoices.id, entryId));
      }
    }
  }
}
