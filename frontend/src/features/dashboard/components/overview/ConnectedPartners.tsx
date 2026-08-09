import { cn } from "@/shared/utils/cn";

import type { OverviewConnectedPartner } from "../../utils/overview.types";
import { partnerSelectionKey } from "../../utils/overview.types";
import { overviewMotionClass } from "../../utils/overview.motion";

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
      className="flex h-full min-h-[320px] w-full flex-col overflow-hidden rounded-2xl border border-violet-200 bg-violet-50/40 shadow-sm"
    >
      <div className="border-b border-violet-200 bg-violet-50 px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-ink-900">
              Connected vendors & customers
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Active intercompany links · select to focus statement
            </p>
          </div>
          {partners.length > 0 ? (
            <span className="shrink-0 rounded-lg bg-violet-700 px-2 py-1 text-[11px] font-semibold tabular-nums text-surface">
              {partners.length}
            </span>
          ) : null}
        </div>
      </div>

      {partners.length === 0 ? (
        <div
          className={cn("flex flex-1 flex-col justify-center px-5 py-8", overviewMotionClass.empty)}
        >
          <p className="text-sm font-medium text-ink-900">
            No intercompany partners mapped for this company.
          </p>
          <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-neutral-500">
            Links come from active IC_BP_MAPPING rows for this company.
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-violet-100 px-2.5 py-2">
            <button
              type="button"
              onClick={onSelectAll}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm",
                "transition-[transform,background-color,box-shadow,color] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "active:scale-[0.99]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700/30",
                allSelected
                  ? "bg-violet-700 text-surface shadow-sm ring-1 ring-violet-700"
                  : "text-neutral-600 hover:bg-violet-50 hover:text-violet-900",
              )}
              aria-pressed={allSelected}
            >
              <span className="font-semibold">All connected</span>
              <span
                className={cn("text-xs", allSelected ? "text-surface/70" : "text-violet-700/60")}
              >
                Statement totals
              </span>
            </button>
          </div>

          <ul
            className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2.5"
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
                      "flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-left",
                      "transition-[transform,background-color,box-shadow,color] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]",
                      "active:scale-[0.99]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700/30",
                      isSelected
                        ? "bg-violet-100 shadow-sm ring-1 ring-violet-200"
                        : "hover:bg-violet-50",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        partner.role === "vendor"
                          ? "bg-violet-700 text-surface"
                          : "bg-teal-600 text-surface",
                      )}
                    >
                      {roleLabel(partner.role)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm font-semibold",
                          isSelected ? "text-ink-900" : "text-ink-900",
                        )}
                      >
                        {title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-neutral-500">
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
