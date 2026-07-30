/**
 * Client currency helpers.
 *
 * SAP local currency often arrives as "$" (sentinel). Never display or send that —
 * use VITE_DEFAULT_CURRENCY_CODE (aligned with backend DEFAULT_CURRENCY_CODE).
 */

/** Env fallback when OADM/admin or document currency is missing or "$". */
export const getDefaultCurrencyCode = (): string => {
  const fromEnv = String(import.meta.env.VITE_DEFAULT_CURRENCY_CODE ?? "").trim();
  return fromEnv;
};

/** Empty or SAP local-currency sentinel — not a usable ISO code. */
export const isUnresolvedCurrency = (value: unknown): boolean => {
  const raw = String(value ?? "").trim();
  return !raw || raw === "$";
};

/**
 * Resolve a currency code for UI/payloads.
 * Prefer provided value; if unresolved, use fallback then env.
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

/** For DocCurrency payload: omit MULTI / unresolved; let backend use OADM→env. */
export const resolveDocCurrencyForPayload = (
  summaryCurrencyLabel: string | null | undefined,
  partnerCurrency?: string | null,
): string | undefined => {
  const summary = String(summaryCurrencyLabel ?? "").trim();
  if (summary && summary !== "MULTI" && !isUnresolvedCurrency(summary)) {
    return summary;
  }
  const partner = String(partnerCurrency ?? "").trim();
  if (!isUnresolvedCurrency(partner)) {
    return partner;
  }
  const envCode = getDefaultCurrencyCode();
  return envCode || undefined;
};
