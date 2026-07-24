import { cn } from "@/shared/utils/cn";

import type { OverviewConnectedPartner } from "../../utils/overview.types";
import { partnerSelectionKey } from "../../utils/overview.types";

interface ConnectedPartnersProps {
  partners: OverviewConnectedPartner[];
  selectedKey: string | null;
  onSelectAll: () => void;
  onSelectPartner: (partner: OverviewConnectedPartner) => void;
}

function roleLabel(role: "vendor" | "customer"): string {
  return role === "vendor" ? "Vendor" : "Customer";
}

export function ConnectedPartners({
  partners,
  selectedKey,
  onSelectAll,
  onSelectPartner,
}: ConnectedPartnersProps) {
  const allSelected = selectedKey === null;

  return (
    <section
      aria-label="Connected vendors and customers"
      className="flex min-h-[220px] flex-col rounded-xl border border-zinc-200 bg-white"
    >
      <div className="border-b border-zinc-100 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Connected vendors & customers</h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Active intercompany links · select to focus statement
            </p>
          </div>
          {partners.length > 0 ? (
            <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-zinc-600">
              {partners.length}
            </span>
          ) : null}
        </div>
      </div>

      {partners.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center px-4 py-6">
          <p className="text-sm text-zinc-600">No intercompany partners mapped for this company.</p>
          <p className="mt-1 text-xs text-zinc-400">
            Links come from active IC_BP_MAPPING rows for this company.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <div className="border-b border-zinc-50 px-2 py-1.5">
            <button
              type="button"
              onClick={onSelectAll}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                allSelected
                  ? "bg-blue-50 text-blue-950"
                  : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900",
              )}
              aria-pressed={allSelected}
            >
              <span className="font-medium">All connected</span>
              <span className="text-xs text-zinc-400">Statement totals</span>
            </button>
          </div>

          <ul
            className="flex max-h-[280px] flex-col overflow-y-auto p-2"
            role="listbox"
            aria-label="Partner list"
          >
            {partners.map((partner) => {
              const key = partnerSelectionKey(partner);
              const isSelected = selectedKey === key;
              const title = partner.cardName?.trim() || partner.cardCode;
              const subtitle = partner.partnerCompanyName?.trim() || partner.cardCode;

              return (
                <li key={key} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => onSelectPartner(partner)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                      isSelected ? "bg-blue-50 ring-1 ring-blue-100" : "hover:bg-zinc-50",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        partner.role === "vendor"
                          ? "bg-violet-50 text-violet-700"
                          : "bg-emerald-50 text-emerald-700",
                      )}
                    >
                      {roleLabel(partner.role)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm font-medium",
                          isSelected ? "text-blue-950" : "text-zinc-900",
                        )}
                      >
                        {title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-zinc-400">
                        {partner.cardCode}
                        {subtitle !== partner.cardCode && subtitle !== title
                          ? ` · ${subtitle}`
                          : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
