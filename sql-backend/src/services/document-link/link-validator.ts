import { and, eq } from "drizzle-orm";

import { AppError } from "@/core/errors/app-error";
import type { LooseDb } from "@/types/db.types";

import { DOCUMENT_REGISTRY } from "./document-link.registry";
import { calculateOpenQty } from "./open-qty.calculator";

/**
 * Validates that base document links exist, are linked to the correct cardCode and itemCode,
 * and have enough remaining open quantity to cover the requested quantity.
 * Runs validation for all lines concurrently.
 */
export async function validateBaseLinks(
  db: LooseDb,
  lines: Record<string, unknown>[],
  selectedCardCode: string,
  excludeChildDocId?: number,
  excludeChildDocType?: number,
): Promise<void> {
  await Promise.all(
    lines.map(async (line) => {
      const baseType = Number(line.baseType);
      const baseEntry = Number(line.baseEntry);
      const baseLine = Number(line.baseLine);
      const requestedQty = Number(line.quantity || 0);

      if (!Number.isFinite(baseType) || !Number.isFinite(baseEntry) || !Number.isFinite(baseLine)) {
        return;
      }

      const registryEntry = DOCUMENT_REGISTRY[baseType];
      if (!registryEntry) {
        throw new AppError(`Unsupported base document type ${baseType}`, 400, "BAD_REQUEST");
      }

      const [header] = await db
        .select({ cardCode: registryEntry.headerTable.cardCode })
        .from(registryEntry.headerTable)
        .where(eq(registryEntry.headerTable.id, baseEntry))
        .limit(1);

      const [baseLineItem] = await db
        .select({
          itemCode: registryEntry.lineTable.itemCode,
          quantity: registryEntry.lineTable.quantity,
        })
        .from(registryEntry.lineTable)
        .where(
          and(
            eq(registryEntry.lineTable.docEntry, baseEntry),
            eq(registryEntry.lineTable.lineNum, baseLine),
          ),
        )
        .limit(1);

      if (!baseLineItem) {
        throw new AppError(
          `Base document line not found for baseEntry ${baseEntry}, baseLine ${baseLine}`,
          400,
          "BAD_REQUEST",
        );
      }

      const parentCardCode = header?.cardCode || "";
      const parentItemCode = baseLineItem.itemCode || "";
      const parentQuantity = Number(baseLineItem.quantity || 0);

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
    }),
  );
}
