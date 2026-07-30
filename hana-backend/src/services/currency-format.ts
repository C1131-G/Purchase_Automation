/**
 * Currency resolution for display and SAP payloads.
 *
 * SAP often stores local currency as "$" (sentinel), not a real ISO code.
 * Prefer OADM.MainCurncy; if missing, "$", or admin lookup fails → env DEFAULT_CURRENCY_CODE.
 */

import { config } from "@/config/env";
import { getTenantRepository } from "@/db/tenant-query";
import { AdminSettingsSchema } from "@/db/schemas/admin-settings.schema";

/** Env fallback (DEFAULT_CURRENCY_CODE). Never hardcode a currency symbol/code elsewhere. */
export const getDefaultCurrencyCode = (): string => {
  const code = String(config.currency.defaultCode ?? "").trim();
  return code;
};

/**
 * SAP local-currency sentinel or empty — not a usable ISO code for UI/payloads.
 */
export const isUnresolvedCurrency = (value: unknown): boolean => {
  const raw = String(value ?? "").trim();
  return !raw || raw === "$";
};

/**
 * Sync: return usable currency code, else env default (or optional fallback).
 * Use when OADM is already known or only env is available.
 */
export const resolveCurrencyCode = (
  value: unknown,
  fallback: string = getDefaultCurrencyCode(),
): string => {
  const raw = String(value ?? "").trim();
  if (!isUnresolvedCurrency(raw)) {
    return raw;
  }
  const fallbackCode = String(fallback ?? "").trim();
  if (!isUnresolvedCurrency(fallbackCode)) {
    return fallbackCode;
  }
  return getDefaultCurrencyCode();
};

/**
 * Tenant display currency: OADM.MainCurncy → env DEFAULT_CURRENCY_CODE.
 * Never returns "$". Safe if admin table/query fails.
 */
export const getDisplayCurrency = async (dbName: string): Promise<string> => {
  const envDefault = getDefaultCurrencyCode();
  try {
    if (!dbName) {
      return envDefault;
    }
    const repo = await getTenantRepository(dbName, AdminSettingsSchema);
    const settings = await repo.findOne({ select: ["MainCurncy"] });
    return resolveCurrencyCode(settings?.MainCurncy, envDefault);
  } catch {
    // Admin/OADM lookup failed — env only.
  }
  return envDefault;
};
