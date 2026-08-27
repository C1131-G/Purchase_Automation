import { executeTenantQuery } from "@/db/tenant-query";

const toCurrency = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toUpperCase();

const toPositiveRate = (value: unknown): number | undefined => {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : undefined;
};

export const getLatestCurrencyRates = async (
  dbName: string,
  currencies: Iterable<string>,
): Promise<ReadonlyMap<string, number>> => {
  const requestedCurrencies = [...new Set([...currencies].map(toCurrency).filter(Boolean))];
  if (requestedCurrencies.length === 0) {
    return new Map();
  }

  const placeholders = requestedCurrencies.map(() => "?").join(", ");
  const rows = await executeTenantQuery(
    dbName,
    `SELECT "Currency", "Rate", "RateDate"
       FROM "ORTT"
      WHERE "Currency" IN (${placeholders})
        AND "RateDate" <= CURRENT_DATE
        AND "Rate" > 0
      ORDER BY "Currency", "RateDate" DESC`,
    requestedCurrencies,
  );

  const rates = new Map<string, number>();
  if (!Array.isArray(rows)) {
    return rates;
  }

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const currency = toCurrency(record.Currency ?? record.currency);
    const rate = toPositiveRate(record.Rate ?? record.rate);
    if (currency && rate !== undefined && !rates.has(currency)) {
      rates.set(currency, rate);
    }
  }

  return rates;
};
