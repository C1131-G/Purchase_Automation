import { formatCurrency, formatNumber } from "../../utils/formatters";
import type { OverviewArApprovalItem } from "../../utils/overview.types";

interface NeedsAttentionProps {
  items: OverviewArApprovalItem[];
  currency: string;
}

function formatDocDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function docLabel(item: OverviewArApprovalItem): string {
  if (item.docNum !== null && item.docNum > 0) {
    return String(item.docNum);
  }
  return item.isDraft ? `Draft ${item.docEntry}` : String(item.docEntry);
}

/**
 * AR invoices waiting in SAP approval (OWDD). Strip chip scrolls here.
 */
export function NeedsAttention({ items, currency }: NeedsAttentionProps) {
  return (
    <section
      aria-label="Needs attention"
      className="flex min-h-[220px] flex-col rounded-xl border border-zinc-200 bg-white"
    >
      <div className="border-b border-zinc-100 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Needs attention</h2>
            <p className="mt-0.5 text-xs text-zinc-400">AR invoices waiting for approval</p>
          </div>
          {items.length > 0 ? (
            <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-amber-800">
              {formatNumber(items.length)}
            </span>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center px-4 py-6">
          <p className="text-sm text-zinc-600">No AR invoices waiting for approval.</p>
          <p className="mt-1 text-xs text-zinc-400">
            When approval workflow is on, pending AR invoices from OWDD show here.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_minmax(0,6.5rem)_minmax(0,4rem)_minmax(0,5rem)] gap-2 border-b border-zinc-50 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400 sm:grid">
            <span>Doc</span>
            <span>Customer</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Age</span>
            <span className="text-right">Status</span>
          </div>

          <ul className="flex max-h-[280px] flex-col overflow-y-auto" role="list">
            {items.map((item) => {
              const name = item.cardName?.trim() || item.cardCode || "—";
              const code = item.cardCode?.trim();
              const showCode = Boolean(code && code !== name);

              return (
                <li
                  key={`${item.wddCode}-${item.docEntry}`}
                  className="grid grid-cols-1 gap-1 border-b border-zinc-50 px-4 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_minmax(0,6.5rem)_minmax(0,4rem)_minmax(0,5rem)] sm:items-center sm:gap-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium tabular-nums text-zinc-900">
                      {docLabel(item)}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                      {item.isDraft ? "Draft · " : ""}
                      {formatDocDate(item.docDate)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-800">{name}</p>
                    {showCode ? (
                      <p className="mt-0.5 truncate text-[11px] text-zinc-400">{code}</p>
                    ) : item.requester ? (
                      <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                        By {item.requester}
                      </p>
                    ) : null}
                  </div>

                  <p className="text-sm font-medium tabular-nums text-zinc-900 sm:text-right">
                    {formatCurrency(item.docTotal, currency)}
                  </p>

                  <p className="text-sm tabular-nums text-zinc-600 sm:text-right">
                    <span className="sm:hidden text-xs text-zinc-400">Age · </span>
                    {item.ageDays}d
                  </p>

                  <div className="sm:text-right">
                    <span className="inline-flex rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                      {item.status}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
