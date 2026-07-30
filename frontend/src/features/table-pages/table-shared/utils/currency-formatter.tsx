/**
 * Formats a document total value with the given currency,
 * rendering the currency code in small, light text and the amount in semi-bold text.
 * Never shows SAP local "$" — uses VITE_DEFAULT_CURRENCY_CODE when unresolved.
 */
import { isUnresolvedCurrency, resolveCurrencyCode } from "@/shared/utils/currency";

export function formatDocTotal(value: unknown, currency?: string) {
  const rawAmount = Number.parseFloat(String(value));
  if (Number.isNaN(rawAmount)) return "-";

  const amount = Math.round(rawAmount * 20) / 20;
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);

  const displayCurrency = resolveCurrencyCode(currency);
  const showCurrency = !isUnresolvedCurrency(displayCurrency);

  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      {showCurrency ? (
        <span className="text-[10px] font-light text-zinc-500 uppercase tracking-wider">
          {displayCurrency}
        </span>
      ) : null}
      <span className="font-semibold text-zinc-900">{formattedAmount}</span>
    </span>
  );
}
