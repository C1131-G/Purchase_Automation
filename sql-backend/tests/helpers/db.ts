import { getDb } from "@/db/client";

/** Thrown inside a transaction so the driver rolls back while we keep the result. */
export class TestRollback extends Error {
  constructor(public readonly result: unknown) {
    super("TEST_ROLLBACK");
    this.name = "TestRollback";
  }
}

/**
 * Run work inside a DB transaction and always roll back.
 * Requires a live DATABASE_URL / test database.
 */
export async function withRollbackResult<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      const result = await fn(tx);
      throw new TestRollback(result);
    });
    throw new Error("withRollbackResult: transaction completed without rollback");
  } catch (err) {
    if (err instanceof TestRollback) {
      return err.result as T;
    }
    throw err;
  }
}

export const hasTestDatabase = Boolean(process.env.DATABASE_URL);
