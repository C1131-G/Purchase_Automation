import { and, eq, sql } from "drizzle-orm";

import type { LooseDb } from "@/types/db.types";

import { DOCUMENT_REGISTRY } from "./document-link.registry";

/**
 * Calculates the remaining open quantity of a parent document line.
 * It subtracts the total quantity consumed by child documents from the parent line's original quantity.
 */
export async function calculateOpenQty(
  db: LooseDb,
  baseType: number,
  baseEntry: number,
  baseLine: number,
  originalQty: number,
  excludeChildDocId?: number,
  excludeChildDocType?: number,
): Promise<number> {
  const registryEntry = DOCUMENT_REGISTRY[baseType];
  if (!registryEntry) {
    return originalQty;
  }

  const childQueries: Promise<number>[] = [];

  for (const childDoc of registryEntry.childDocs) {
    childQueries.push(
      (async () => {
        const exclude = excludeChildDocType === childDoc.childType && excludeChildDocId;
        const condition = exclude
          ? and(
              eq(childDoc.childLineTable.baseType, baseType),
              eq(childDoc.childLineTable.baseEntry, baseEntry),
              eq(childDoc.childLineTable.baseLine, baseLine),
              sql`${childDoc.childHeaderTable.docStatus} <> 'D'`,
              sql`COALESCE(${childDoc.childHeaderTable.canceled}, 'N') <> 'Y'`,
              sql`${childDoc.childLineTable.docEntry} <> ${excludeChildDocId}`,
            )
          : and(
              eq(childDoc.childLineTable.baseType, baseType),
              eq(childDoc.childLineTable.baseEntry, baseEntry),
              eq(childDoc.childLineTable.baseLine, baseLine),
              sql`${childDoc.childHeaderTable.docStatus} <> 'D'`,
              sql`COALESCE(${childDoc.childHeaderTable.canceled}, 'N') <> 'Y'`,
            );

        const rows = await db
          .select({ quantity: childDoc.childLineTable.quantity })
          .from(childDoc.childLineTable)
          .innerJoin(
            childDoc.childHeaderTable,
            eq(childDoc.childHeaderTable.id, childDoc.childLineTable.docEntry),
          )
          .where(condition);

        return rows.reduce(
          (totalConsumed: number, childLine: { quantity?: number | string | null }) =>
            totalConsumed + Number(childLine.quantity || 0),
          0,
        );
      })(),
    );
  }

  const results = await Promise.all(childQueries);
  const consumedQty = results.reduce(
    (runningQtySum, childQty) => runningQtySum + Number(childQty),
    0,
  );

  return Math.max(0, originalQty - consumedQty);
}
