/** AddressGrid: Specialized sub-form for dual-address management (Billing/Shipping). */
import { ChevronDown, Lock, Pencil } from "lucide-react";

import { Select } from "@/components/select/select";
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import { AddressUploadPanel } from "./address-upload-panel";

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
  billToOptions?: { addressName: string; addressText: string; addressType?: string }[];
  shipToOptions?: { addressName: string; addressText: string; addressType?: string }[];
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
  editableHighlight = false,
  uniformReadOnlyAppearance = false,
  billToOptions = [],
  shipToOptions = [],
}: AddressGridProps) {
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
    <SectionCard title="ADDRESS" className={`${className} h-full min-h-55`}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col">
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

            {billToOptions.length > 0 && (
              <div className="mb-2">
                <Select
                  disabled={readOnly}
                  value={billToSelectValue}
                  onValueChange={(val) => {
                    if (val === "custom") return;
                    const opt = billToOptions.find((o) => o.addressName === val);
                    if (opt) {
                      onBillToAddressChange(opt.addressText);
                    }
                  }}
                >
                  <Select.Trigger
                    className={`h-8.5 w-full rounded-lg border px-3 py-1 text-xs focus:outline-none transition-all ${
                      readOnly
                        ? "border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300"
                    }`}
                  >
                    <Select.Value placeholder="Select Address" labelMap={billToLabelMap} />
                    <Select.Icon>
                      <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner className="z-50">
                      <Select.Popup className="max-h-60 overflow-y-auto border border-zinc-200/80 bg-white shadow-lg p-1">
                        <Select.List className="p-0 space-y-0.5">
                          {billToOptions.map((opt) => (
                            <Select.Item key={opt.addressName} value={opt.addressName}>
                              <div className="text-left text-[11px] text-zinc-700 whitespace-pre-line py-0.5 leading-relaxed">
                                {opt.addressText}
                              </div>
                            </Select.Item>
                          ))}
                          {billToAddress.trim() && !matchedBillToOpt && (
                            <Select.Item value="custom">
                              <span className="italic text-zinc-400 text-xs">Custom Address</span>
                            </Select.Item>
                          )}
                        </Select.List>
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select>
              </div>
            )}

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
          <div className="flex flex-col">
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

            {shipToOptions.length > 0 && (
              <div className="mb-2">
                <Select
                  disabled={readOnly}
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
                      readOnly
                        ? "border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300"
                    }`}
                  >
                    <Select.Value placeholder="Select Address" labelMap={shipToLabelMap} />
                    <Select.Icon>
                      <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner className="z-50">
                      <Select.Popup>
                        <Select.List className="p-0 space-y-0.5 border border-zinc-200/80 bg-white shadow-lg p-1">
                          {shipToOptions.map((opt) => (
                            <Select.Item key={opt.addressName} value={opt.addressName}>
                              <div className="text-left text-[11px] text-zinc-700 whitespace-pre-line py-0.5 leading-relaxed">
                                {opt.addressText}
                              </div>
                            </Select.Item>
                          ))}
                          {shipToAddress.trim() && !matchedShipToOpt && (
                            <Select.Item value="custom">
                              <span className="italic text-zinc-400 text-xs">Custom Address</span>
                            </Select.Item>
                          )}
                        </Select.List>
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select>
              </div>
            )}

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
        <div className="w-full">
          <AddressUploadPanel readOnly={readOnly} loading={loading} />
        </div>
      </div>
    </SectionCard>
  );
}
