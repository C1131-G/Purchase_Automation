import { isUnresolvedCurrency, resolveCurrencyCode } from "@/shared/utils/currency";

export function formatCurrency(
  value: number | undefined | null,
  currencyCode?: string,
  isCompact = false,
): string {
  if (value === undefined || value === null || isNaN(value)) return "—";

  // Never use SAP "$" or empty — resolve via VITE_DEFAULT_CURRENCY_CODE.
  const cleanCurrency = resolveCurrencyCode(currencyCode);
  if (isUnresolvedCurrency(cleanCurrency)) {
    return new Intl.NumberFormat("en-US", {
      notation: isCompact ? "compact" : "standard",
      maximumFractionDigits: isCompact ? 1 : 2,
      minimumFractionDigits: isCompact ? 0 : 2,
    }).format(value);
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cleanCurrency,
      notation: isCompact ? "compact" : "standard",
      maximumFractionDigits: isCompact ? 1 : 2,
      minimumFractionDigits: isCompact ? 0 : 2,
    }).format(value);
  } catch {
    // Invalid ISO for Intl — show code + decimal amount (no "$" symbol).
    const formattedNum = new Intl.NumberFormat("en-US", {
      notation: isCompact ? "compact" : "standard",
      maximumFractionDigits: isCompact ? 1 : 2,
      minimumFractionDigits: isCompact ? 0 : 2,
    }).format(value);
    return `${cleanCurrency} ${formattedNum}`.trim();
  }
}

export function formatPercent(value: number | undefined | null, decimals = 1): string {
  if (value === undefined || value === null || isNaN(value)) return "0.0%";

  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value / 100);
}

export function formatNumber(value: number | undefined | null, isCompact = false): string {
  if (value === undefined || value === null || isNaN(value)) return "0";

  return new Intl.NumberFormat("en-US", {
    notation: isCompact ? "compact" : "standard",
    maximumFractionDigits: isCompact ? 1 : 0,
  }).format(value);
}

export function formatTrend(
  value: number | undefined | null,
  decimals = 1,
): { text: string; isPositive: boolean; isNegative: boolean } {
  if (value === undefined || value === null || isNaN(value)) {
    return { text: "0.0%", isPositive: false, isNegative: false };
  }
  const isPositive = value > 0;
  const isNegative = value < 0;
  const prefix = isPositive ? "+" : "";
  const formattedVal = formatPercent(Math.abs(value), decimals);
  return {
    text: `${prefix}${formattedVal}`,
    isPositive,
    isNegative,
  };
}
