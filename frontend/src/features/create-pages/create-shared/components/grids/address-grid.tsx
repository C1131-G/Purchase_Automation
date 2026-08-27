/** AddressGrid: Specialized sub-form for dual-address management (Billing/Shipping). */
import { ChevronDown, Lock, Pencil } from "lucide-react";

import { Select } from "@/components/select/select";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import {
  clipSapText,
  SAP_FIELD_MAX,
} from "@/features/create-pages/create-shared/utils/sap-document-fields";

interface AddressGridProps {
  billToAddress: string;
  shipToAddress: string;
  loading?: boolean;
  className?: string;
  onBillToAddressChange?: (value: string) => void;
  onShipToAddressChange: (value: string) => void;
  billToAddressInvalid?: boolean | undefined;
  shipToAddressInvalid?: boolean | undefined;
  billToAddressErrorText?: string | undefined;
  shipToAddressErrorText?: string | undefined;
  readOnly?: boolean;
  billToReadOnly?: boolean;
  shipToReadOnly?: boolean;
  editableHighlight?: boolean;
  /** Visual-only override: read-only fields render with the same background as editable fields. */
  uniformReadOnlyAppearance?: boolean;
  billToOptions?: { addressName: string; addressText: string; addressType?: string }[];
  shipToOptions?: { addressName: string; addressText: string; addressType?: string }[];
  billToLabel?: string;
  shipToLabel?: string;
}

const normalizeAddress = (val: string) => {
  return (val || "").replaceAll(/[^a-zA-Z0-9]/g, "").toLowerCase();
};

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
  billToReadOnly = true,
  shipToReadOnly,
  editableHighlight = false,
  uniformReadOnlyAppearance: _uniformReadOnlyAppearance = false,
  billToOptions = [],
  shipToOptions = [],
  billToLabel,
  shipToLabel,
}: AddressGridProps) {
  const isBillToReadOnly = billToReadOnly || readOnly;
  const isShipToReadOnly = shipToReadOnly ?? readOnly;

  const displayBillToLabel = billToLabel || "Bill To Address";
  const displayShipToLabel = shipToLabel || "Ship To Address";

  const normBillTo = normalizeAddress(billToAddress);
  const normShipTo = normalizeAddress(shipToAddress);

  const matchedBillToOpt = billToOptions.find(
    (opt) => normalizeAddress(opt.addressText) === normBillTo,
  );
  const billToSelectValue = matchedBillToOpt
    ? matchedBillToOpt.addressName
    : billToAddress.trim()
      ? "custom"
      : "";

  const matchedShipToOpt = shipToOptions.find(
    (opt) => normalizeAddress(opt.addressText) === normShipTo,
  );
  const shipToSelectValue = matchedShipToOpt
    ? matchedShipToOpt.addressName
    : shipToAddress.trim()
      ? "custom"
      : "";

  const billToLabelMap = billToOptions.reduce<Record<string, string>>(
    (acc, opt) => {
      acc[opt.addressName] = "Change Address";
      return acc;
    },
    { custom: "Change Address" },
  );

  const shipToLabelMap = shipToOptions.reduce<Record<string, string>>(
    (acc, opt) => {
      acc[opt.addressName] = "Change Address";
      return acc;
    },
    { custom: "Change Address" },
  );

  return (
    <SectionCard title="ADDRESS" className={`${className} h-full`}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col">
            <label
              htmlFor="po-bill-to-address"
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500"
            >
              <span className="inline-flex items-center gap-1.5">
                <span>{displayBillToLabel}</span>
                {isBillToReadOnly ? (
                  <Lock className="h-3 w-3 text-neutral-400" aria-hidden="true" />
                ) : null}
                {!isBillToReadOnly && editableHighlight ? (
                  <Pencil className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                ) : null}
              </span>
            </label>

            <div className="mb-2">
              <Select
                disabled={readOnly || billToOptions.length === 0}
                value={billToSelectValue}
                onValueChange={(val) => {
                  if (val === "custom") return;
                  const opt = billToOptions.find((o) => o.addressName === val);
                  if (opt) {
                    onBillToAddressChange?.(opt.addressText);
                  }
                }}
              >
                <Select.Trigger
                  className={`h-8.5 w-full rounded-lg border px-3 py-1 text-xs focus:outline-none transition-all ${
                    readOnly || billToOptions.length === 0
                      ? "border-linen-200 bg-field-silver text-neutral-400 cursor-not-allowed"
                      : "border-linen-200 bg-field-silver text-ink-900 hover:bg-surface hover:border-linen-200"
                  }`}
                >
                  <Select.Value placeholder="Change Address" labelMap={billToLabelMap} />
                  <Select.Icon>
                    <ChevronDown className="h-3.5 w-3.5 text-neutral-500" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner className="z-50">
                    <Select.Popup className="max-h-60 overflow-y-auto border border-linen-200/80 bg-surface shadow-lg p-1">
                      <Select.List className="p-0 space-y-0.5">
                        {billToOptions.map((opt) => (
                          <Select.Item key={opt.addressName} value={opt.addressName}>
                            <div className="text-left text-[11px] text-ink-900 whitespace-pre-line py-0.5 leading-relaxed">
                              {opt.addressText}
                            </div>
                          </Select.Item>
                        ))}
                        {billToAddress.trim() && !matchedBillToOpt && (
                          <Select.Item value="custom">
                            <span className="italic text-neutral-400 text-xs">Custom Address</span>
                          </Select.Item>
                        )}
                      </Select.List>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select>
            </div>

            {loading ? (
              <div className="h-36 animate-pulse rounded-xl border border-linen-200 bg-linen-100" />
            ) : (
              <textarea
                id="po-bill-to-address"
                value={billToAddress}
                readOnly={isBillToReadOnly}
                onKeyDown={(event) => {
                  if (
                    isBillToReadOnly &&
                    (event.key === "Backspace" ||
                      event.key === "Delete" ||
                      (!event.ctrlKey && !event.metaKey && event.key.length === 1))
                  ) {
                    event.preventDefault();
                  }
                }}
                onCut={(event) => {
                  if (isBillToReadOnly) {
                    event.preventDefault();
                  }
                }}
                onPaste={(event) => {
                  if (isBillToReadOnly) {
                    event.preventDefault();
                  }
                }}
                onChange={
                  isBillToReadOnly
                    ? undefined
                    : (event) =>
                        onBillToAddressChange?.(
                          clipSapText(event.target.value, SAP_FIELD_MAX.address),
                        )
                }
                maxLength={SAP_FIELD_MAX.address}
                placeholder={isBillToReadOnly ? displayBillToLabel : `Enter ${displayBillToLabel}`}
                className={`h-36 w-full rounded-xl border px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 ${
                  billToAddressInvalid
                    ? "border-red-300 bg-red-50 focus:border-red-400 focus:bg-surface focus:ring-2 focus:ring-red-200"
                    : !isBillToReadOnly && editableHighlight
                      ? "border-emerald-300 bg-emerald-50/60 text-ink-900 focus:border-emerald-400 focus:bg-surface focus:ring-2 focus:ring-emerald-200"
                      : isBillToReadOnly
                        ? "cursor-not-allowed border-linen-200 bg-field-silver text-ink-900"
                        : "border-linen-200 bg-field-silver text-ink-900 focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
                }`}
              />
            )}
            {billToAddressInvalid && billToAddressErrorText ? (
              <p className="mt-1 text-xs text-red-600">{billToAddressErrorText}</p>
            ) : null}
          </div>
          <div className="flex flex-col">
            <label
              htmlFor="po-ship-to-address"
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500"
            >
              <span className="inline-flex items-center gap-1.5">
                <span>{displayShipToLabel}</span>
                {isShipToReadOnly ? (
                  <Lock className="h-3 w-3 text-neutral-400" aria-hidden="true" />
                ) : null}
                {!isShipToReadOnly && editableHighlight ? (
                  <Pencil className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                ) : null}
              </span>
            </label>

            <div className="mb-2">
              <Select
                disabled={isShipToReadOnly || shipToOptions.length === 0}
                value={shipToSelectValue}
                onValueChange={(val) => {
                  if (val === "custom") return;
                  const opt = shipToOptions.find((o) => o.addressName === val);
                  if (opt) {
                    onShipToAddressChange(opt.addressText);
                  }
                }}
              >
                <Select.Trigger
                  className={`h-8.5 w-full rounded-lg border px-3 py-1 text-xs focus:outline-none transition-all ${
                    isShipToReadOnly || shipToOptions.length === 0
                      ? "border-linen-200 bg-field-silver text-neutral-400 cursor-not-allowed"
                      : "border-linen-200 bg-field-silver text-ink-900 hover:bg-surface hover:border-linen-200"
                  }`}
                >
                  <Select.Value placeholder="Change Address" labelMap={shipToLabelMap} />
                  <Select.Icon>
                    <ChevronDown className="h-3.5 w-3.5 text-neutral-500" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner className="z-50">
                    <Select.Popup>
                      <Select.List className="p-0 space-y-0.5 border border-linen-200/80 bg-surface shadow-lg p-1">
                        {shipToOptions.map((opt) => (
                          <Select.Item key={opt.addressName} value={opt.addressName}>
                            <div className="text-left text-[11px] text-ink-900 whitespace-pre-line py-0.5 leading-relaxed">
                              {opt.addressText}
                            </div>
                          </Select.Item>
                        ))}
                        {shipToAddress.trim() && !matchedShipToOpt && (
                          <Select.Item value="custom">
                            <span className="italic text-neutral-400 text-xs">Custom Address</span>
                          </Select.Item>
                        )}
                      </Select.List>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select>
            </div>

            {loading ? (
              <div className="h-36 animate-pulse rounded-xl border border-linen-200 bg-linen-100" />
            ) : (
              <textarea
                id="po-ship-to-address"
                value={shipToAddress}
                readOnly={isShipToReadOnly}
                onChange={(event) =>
                  onShipToAddressChange(clipSapText(event.target.value, SAP_FIELD_MAX.address))
                }
                maxLength={SAP_FIELD_MAX.address}
                placeholder={`Enter ${displayShipToLabel}`}
                className={`h-36 w-full rounded-xl border px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 ${
                  shipToAddressInvalid
                    ? "border-red-300 bg-red-50 focus:border-red-400 focus:bg-surface focus:ring-2 focus:ring-red-200"
                    : !isShipToReadOnly && editableHighlight
                      ? "border-emerald-300 bg-emerald-50/60 text-ink-900 focus:border-emerald-400 focus:bg-surface focus:ring-2 focus:ring-emerald-200"
                      : isShipToReadOnly
                        ? "cursor-not-allowed border-linen-200 bg-field-silver text-ink-900"
                        : "border-linen-200 bg-field-silver text-ink-900 focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
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
