// Overview statement: IC partner OCRD balances + open OINV/OPCH aging (P4).

import { logger } from "@/core/logger/pino-logger";
import { executeTenantQuery } from "@/db/tenant-query";

export type OverviewAging = {
  d0_30: number;
  d31_60: number;
  d61_90: number;
  d90_plus: number;
};

export type OverviewStatementPartner = {
  cardCode: string;
  cardName: string;
  /** SAP CardType: S = vendor, C = customer. */
  cardType: "S" | "C";
  balance: number;
  aging: OverviewAging;
};

export type OverviewStatement = {
  partners: OverviewStatementPartner[];
  totals: {
    balance: number;
    aging: OverviewAging;
  };
};

export type StatementPartnerInput = {
  cardCode: string;
  cardName: string | null;
  role: "vendor" | "customer";
};

const toMoney = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
};

export function emptyAging(): OverviewAging {
  return { d0_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
}

/** Assign open amount into aging buckets by days past due (not-yet-due → 0–30). */
export function assignAgingBucket(ageDays: number): keyof OverviewAging {
  const days = Number.isFinite(ageDays) ? Math.trunc(ageDays) : 0;
  if (days <= 30) return "d0_30";
  if (days <= 60) return "d31_60";
  if (days <= 90) return "d61_90";
  return "d90_plus";
}

export function addToAging(target: OverviewAging, ageDays: number, amount: number): OverviewAging {
  const next = { ...target };
  const bucket = assignAgingBucket(ageDays);
  next[bucket] = toMoney(next[bucket] + amount);
  return next;
}

export function sumAging(items: OverviewAging[]): OverviewAging {
  return items.reduce(
    (acc, item) => ({
      d0_30: toMoney(acc.d0_30 + item.d0_30),
      d31_60: toMoney(acc.d31_60 + item.d31_60),
      d61_90: toMoney(acc.d61_90 + item.d61_90),
      d90_plus: toMoney(acc.d90_plus + item.d90_plus),
    }),
    emptyAging(),
  );
}

/** Case-insensitive field pick from raw HANA row. */
function pickRowField(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }
  const lowerMap = new Map(Object.keys(row).map((key) => [key.toLowerCase(), key]));
  for (const key of keys) {
    const actual = lowerMap.get(key.toLowerCase());
    if (actual !== undefined && row[actual] !== undefined && row[actual] !== null) {
      return row[actual];
    }
  }
  return undefined;
}

function roleToCardType(role: "vendor" | "customer"): "S" | "C" {
  return role === "vendor" ? "S" : "C";
}

function dedupePartnerInputs(inputs: StatementPartnerInput[]): StatementPartnerInput[] {
  const seen = new Set<string>();
  const out: StatementPartnerInput[] = [];
  for (const item of inputs) {
    const code = item.cardCode.trim();
    if (!code) continue;
    const key = `${roleToCardType(item.role)}:${code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...item, cardCode: code });
  }
  return out;
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(", ");
}

async function loadBalancesByCode(
  dbName: string,
  cardCodes: string[],
): Promise<Map<string, { cardName: string; cardType: string; balance: number }>> {
  const map = new Map<string, { cardName: string; cardType: string; balance: number }>();
  if (cardCodes.length === 0) return map;

  const sql = `
    SELECT
      bp."CardCode" AS "CardCode",
      bp."CardName" AS "CardName",
      bp."CardType" AS "CardType",
      IFNULL(bp."Balance", 0) AS "Balance"
    FROM "OCRD" bp
    WHERE bp."CardCode" IN (${placeholders(cardCodes.length)})
  `;

  const raw = (await executeTenantQuery(dbName, sql, cardCodes)) as unknown;
  const rows = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const code = String(pickRowField(row, "CardCode", "cardCode") ?? "").trim();
    if (!code) continue;
    map.set(code, {
      cardName: String(pickRowField(row, "CardName", "cardName") ?? "").trim(),
      cardType: String(pickRowField(row, "CardType", "cardType") ?? "")
        .trim()
        .toUpperCase(),
      balance: toMoney(pickRowField(row, "Balance", "balance")),
    });
  }

  return map;
}

/**
 * Aggregate open-invoice residual by card into aging buckets.
 * table: OINV (AR customers) or OPCH (AP vendors).
 */
async function loadOpenInvoiceAging(
  dbName: string,
  table: "OINV" | "OPCH",
  cardCodes: string[],
): Promise<Map<string, OverviewAging>> {
  const map = new Map<string, OverviewAging>();
  if (cardCodes.length === 0) return map;

  // Age from DocDueDate (fallback DocDate). Not-yet-due days are negative → bucket 0–30.
  const sql = `
    SELECT
      inv."CardCode" AS "CardCode",
      SUM(
        CASE
          WHEN DAYS_BETWEEN(IFNULL(inv."DocDueDate", inv."DocDate"), CURRENT_DATE) <= 30
          THEN (IFNULL(inv."DocTotal", 0) - IFNULL(inv."PaidToDate", 0))
          ELSE 0
        END
      ) AS "D0_30",
      SUM(
        CASE
          WHEN DAYS_BETWEEN(IFNULL(inv."DocDueDate", inv."DocDate"), CURRENT_DATE) > 30
           AND DAYS_BETWEEN(IFNULL(inv."DocDueDate", inv."DocDate"), CURRENT_DATE) <= 60
          THEN (IFNULL(inv."DocTotal", 0) - IFNULL(inv."PaidToDate", 0))
          ELSE 0
        END
      ) AS "D31_60",
      SUM(
        CASE
          WHEN DAYS_BETWEEN(IFNULL(inv."DocDueDate", inv."DocDate"), CURRENT_DATE) > 60
           AND DAYS_BETWEEN(IFNULL(inv."DocDueDate", inv."DocDate"), CURRENT_DATE) <= 90
          THEN (IFNULL(inv."DocTotal", 0) - IFNULL(inv."PaidToDate", 0))
          ELSE 0
        END
      ) AS "D61_90",
      SUM(
        CASE
          WHEN DAYS_BETWEEN(IFNULL(inv."DocDueDate", inv."DocDate"), CURRENT_DATE) > 90
          THEN (IFNULL(inv."DocTotal", 0) - IFNULL(inv."PaidToDate", 0))
          ELSE 0
        END
      ) AS "D90_PLUS"
    FROM "${table}" inv
    WHERE inv."DocStatus" = 'O'
      AND IFNULL(inv."CANCELED", 'N') = 'N'
      AND inv."CardCode" IN (${placeholders(cardCodes.length)})
    GROUP BY inv."CardCode"
  `;

  const raw = (await executeTenantQuery(dbName, sql, cardCodes)) as unknown;
  const rows = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const code = String(pickRowField(row, "CardCode", "cardCode") ?? "").trim();
    if (!code) continue;
    map.set(code, {
      d0_30: toMoney(pickRowField(row, "D0_30", "d0_30")),
      d31_60: toMoney(pickRowField(row, "D31_60", "d31_60")),
      d61_90: toMoney(pickRowField(row, "D61_90", "d61_90")),
      d90_plus: toMoney(pickRowField(row, "D90_PLUS", "d90_plus", "D90_Plus")),
    });
  }

  return map;
}

/**
 * Build statement rows for connected IC partners (session-company card codes).
 * Soft-fails to zeros when OCRD/invoice tables are unavailable.
 */
export async function loadStatement(
  dbName: string,
  partnerInputs: StatementPartnerInput[],
): Promise<OverviewStatement> {
  const inputs = dedupePartnerInputs(partnerInputs);
  if (inputs.length === 0) {
    return { partners: [], totals: { balance: 0, aging: emptyAging() } };
  }

  try {
    const allCodes = inputs.map((item) => item.cardCode);
    const vendorCodes = inputs
      .filter((item) => item.role === "vendor")
      .map((item) => item.cardCode);
    const customerCodes = inputs
      .filter((item) => item.role === "customer")
      .map((item) => item.cardCode);

    const [balances, vendorAging, customerAging] = await Promise.all([
      loadBalancesByCode(dbName, allCodes),
      loadOpenInvoiceAging(dbName, "OPCH", vendorCodes),
      loadOpenInvoiceAging(dbName, "OINV", customerCodes),
    ]);

    const partners: OverviewStatementPartner[] = inputs.map((item) => {
      const cardType = roleToCardType(item.role);
      const balanceRow = balances.get(item.cardCode);
      const aging =
        item.role === "vendor"
          ? (vendorAging.get(item.cardCode) ?? emptyAging())
          : (customerAging.get(item.cardCode) ?? emptyAging());

      return {
        cardCode: item.cardCode,
        cardName: (balanceRow?.cardName || item.cardName || item.cardCode).trim(),
        cardType,
        balance: balanceRow?.balance ?? 0,
        aging: {
          d0_30: toMoney(aging.d0_30),
          d31_60: toMoney(aging.d31_60),
          d61_90: toMoney(aging.d61_90),
          d90_plus: toMoney(aging.d90_plus),
        },
      };
    });

    // Stable order: vendors first, then customers; name within role.
    partners.sort((left, right) => {
      if (left.cardType !== right.cardType) {
        return left.cardType === "S" ? -1 : 1;
      }
      return left.cardName.toLowerCase().localeCompare(right.cardName.toLowerCase());
    });

    const totals = {
      balance: toMoney(partners.reduce((sum, row) => sum + row.balance, 0)),
      aging: sumAging(partners.map((row) => row.aging)),
    };

    return { partners, totals };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.warn({
      db: dbName,
      err: caughtError,
      msg: "Overview: statement balance/aging load failed; returning empty statement",
    });
    return { partners: [], totals: { balance: 0, aging: emptyAging() } };
  }
}
