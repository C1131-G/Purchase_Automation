/**
 * Resolve OCRD CardName for IC remarks (never put CardCode in comments).
 *
 * Prefer an already-known name from the document / hook payload.
 * OCRD is a best-effort fallback only (skipped under Vitest — no real tenant DB).
 */

import { executeTenantQuery } from "@/db/tenant-query";
import { logger } from "@/core/logger/pino-logger";

const toName = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text || null;
};

const isUnitTestEnv = (): boolean =>
  process.env.VITEST === "true" || process.env.NODE_ENV === "test";

/**
 * Prefer an already-known name; else look up OCRD.CardName on the tenant DB.
 * Returns null when unresolved — callers omit the name rather than using CardCode.
 */
export const resolveBpCardName = async (params: {
  sapDbName?: string | null;
  cardCode?: string | null;
  preferredName?: string | null;
}): Promise<string | null> => {
  const preferred = toName(params.preferredName);
  if (preferred) {
    return preferred;
  }

  // Unit tests use memory IC SQL only — never open real tenant HANA for OCRD.
  if (isUnitTestEnv()) {
    return null;
  }

  const cardCode = toName(params.cardCode);
  const sapDbName = toName(params.sapDbName);
  if (!cardCode || !sapDbName) {
    return null;
  }

  try {
    const rows = (await executeTenantQuery(
      sapDbName,
      `SELECT "CardName" FROM "OCRD" WHERE "CardCode" = ?`,
      [cardCode],
    )) as Array<Record<string, unknown>>;
    return toName(rows[0]?.CardName ?? rows[0]?.cardName);
  } catch (err: unknown) {
    logger.warn({
      err: err instanceof Error ? err : new Error(String(err)),
      msg: "IC remarks: OCRD CardName lookup failed",
      cardCode,
      sapDbName,
    });
    return null;
  }
};
