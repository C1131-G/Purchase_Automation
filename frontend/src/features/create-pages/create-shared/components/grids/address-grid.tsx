/** AddressGrid: Specialized sub-form for dual-address management (Billing/Shipping). */
import { Lock, Pencil } from "lucide-react";

import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";

interface AddressGridProps {
  billToAddress: string;
  shipToAddress: string;
  loading?: boolean;
  className?: string;
  onBillToAddressChange: (value: string) => void;
  onShipToAddressChange: (value: string) => void;
  billToAddressInvalid?: boolean | undefined;
  shipToAddressInvalid?: boolean | undefined;
  billToAddressErrorText?: string | undefined;
  shipToAddressErrorText?: string | undefined;
  readOnly?: boolean;
  editableHighlight?: boolean;
  /** Visual-only override: read-only fields render with the same background as editable fields. */
  uniformReadOnlyAppearance?: boolean;
}

export function AddressGrid({
  billToAddress,
  shipToAddress,
  loading = false,
  className = "lg:col-span-2",
  onBillToAddressChange,
  onShipToAddressChange,
  billToAddressInvalid,
  shipToAddressInvalid,
  billToAddressErrorText,
  shipToAddressErrorText,
  readOnly = false,
  editableHighlight = false,
  uniformReadOnlyAppearance = false,
}: AddressGridProps) {
  return (
    <SectionCard title="ADDRESS" className={`${className} h-full min-h-55`}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label
              htmlFor="po-bill-to-address"
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500"
            >
              <span className="inline-flex items-center gap-1.5">
                <span>BILL TO ADDRESS</span>
                {readOnly ? <Lock className="h-3 w-3 text-zinc-400" aria-hidden="true" /> : null}
                {!readOnly && editableHighlight ? (
                  <Pencil className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                ) : null}
              </span>
            </label>
            {loading ? (
              <div className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100" />
            ) : (
              <textarea
                id="po-bill-to-address"
                value={billToAddress}
                readOnly={readOnly}
                onChange={(event) => onBillToAddressChange(event.target.value)}
                placeholder="Enter Billing Address"
                className={`h-24 w-full rounded-xl border px-3 py-2 text-sm outline-none transition placeholder:text-zinc-400 ${
                  billToAddressInvalid
                    ? "border-red-300 bg-red-50 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-200"
                    : editableHighlight
                      ? "border-emerald-300 bg-emerald-50/60 text-zinc-900 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                      : "border-zinc-200 bg-zinc-50 text-zinc-800 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                } ${
                  readOnly
                    ? uniformReadOnlyAppearance
                      ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-800"
                      : "cursor-not-allowed border-zinc-300 bg-zinc-100 text-zinc-500"
                    : ""
                }`}
              />
            )}
            {billToAddressInvalid && billToAddressErrorText ? (
              <p className="mt-1 text-xs text-red-600">{billToAddressErrorText}</p>
            ) : null}
          </div>
          <div>
            <label
              htmlFor="po-ship-to-address"
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500"
            >
              <span className="inline-flex items-center gap-1.5">
                <span>SHIP TO ADDRESS</span>
                {readOnly ? <Lock className="h-3 w-3 text-zinc-400" aria-hidden="true" /> : null}
                {!readOnly && editableHighlight ? (
                  <Pencil className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                ) : null}
              </span>
            </label>
            {loading ? (
              <div className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100" />
            ) : (
              <textarea
                id="po-ship-to-address"
                value={shipToAddress}
                readOnly={readOnly}
                onChange={(event) => onShipToAddressChange(event.target.value)}
                placeholder="Enter Shipping Address"
                className={`h-24 w-full rounded-xl border px-3 py-2 text-sm outline-none transition placeholder:text-zinc-400 ${
                  shipToAddressInvalid
                    ? "border-red-300 bg-red-50 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-200"
                    : editableHighlight
                      ? "border-emerald-300 bg-emerald-50/60 text-zinc-900 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                      : "border-zinc-200 bg-zinc-50 text-zinc-800 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                } ${
                  readOnly
                    ? uniformReadOnlyAppearance
                      ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-800"
                      : "cursor-not-allowed border-zinc-300 bg-zinc-100 text-zinc-500"
                    : ""
                }`}
              />
            )}
            {shipToAddressInvalid && shipToAddressErrorText ? (
              <p className="mt-1 text-xs text-red-600">{shipToAddressErrorText}</p>
            ) : null}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
