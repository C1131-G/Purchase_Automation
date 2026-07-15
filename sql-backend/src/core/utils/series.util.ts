import { eq, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { documentSeries } from "@/db/schema/document-series";

/**
 * Atomic helper to acquire the next available document number for a document type.
 * Runs in a transaction and obtains a FOR UPDATE row lock to prevent concurrency conflicts.
 * If the counter series is not initialized in the database, it automatically scans the
 * target table's highest docNum and initializes the series starting from MAX + 1.
 */
export const getNextDocNum = async (
  documentType: string,
  tableName: string,
  defaultStartNum = 1,
): Promise<number> => {
  const db = getDb();

  return await db.transaction(async (tx) => {
    // 1. Check if the counter row exists
    const [existing] = await tx
      .select({ nextNum: documentSeries.nextNum })
      .from(documentSeries)
      .where(eq(documentSeries.documentType, documentType));

    if (existing) {
      // 2. Lock the row using FOR UPDATE
      const lockQuery = await tx.execute(
        sql`SELECT next_num FROM document_series WHERE document_type = ${documentType} FOR UPDATE`,
      );

      const nextNum = Number(lockQuery.rows[0].next_num);

      // 3. Increment the next number by 1
      await tx
        .update(documentSeries)
        .set({ nextNum: nextNum + 1, updatedAt: new Date() })
        .where(eq(documentSeries.documentType, documentType));

      return nextNum;
    }
    // 4. Initialize from existing data
    const maxQuery = await tx.execute(
      sql.raw(
        `SELECT COALESCE(MAX(doc_num), ${defaultStartNum - 1}) as max_val FROM "${tableName}"`,
      ),
    );
    const maxVal = Number(maxQuery.rows[0].max_val);
    const nextNum = maxVal + 1;

    // Save the next available sequence (nextNum + 1)
    await tx.insert(documentSeries).values({
      documentType,
      nextNum: nextNum + 1,
    });

    return nextNum;
  });
};

/**
 * Returns the next available document number without locking transactions or incrementing counters.
 * Used exclusively for UI preview.
 */
export const previewNextDocNum = async (
  documentType: string,
  tableName: string,
  defaultStartNum = 1,
): Promise<number> => {
  const db = getDb();

  const [existing] = await db
    .select({ nextNum: documentSeries.nextNum })
    .from(documentSeries)
    .where(eq(documentSeries.documentType, documentType));

  if (existing) {
    return existing.nextNum;
  }

  // Fallback to table MAX + 1
  const maxQuery = await db.execute(
    sql.raw(`SELECT COALESCE(MAX(doc_num), ${defaultStartNum - 1}) as max_val FROM "${tableName}"`),
  );
  const maxVal = Number(maxQuery.rows[0].max_val);
  return maxVal + 1;
};
