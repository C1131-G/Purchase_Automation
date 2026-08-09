import { useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";

const PRODUCT_ROW_KEYS = ["prod-1", "prod-2"] as const;
const PRODUCT_HEADER_KEYS = [
  "h-product",
  "h-qty",
  "h-price",
  "h-disc-percent",
  "h-disc-amount",
  "h-net",
  "h-total",
  "h-comments",
  "h-actions",
] as const;
/** PQ / RFQ line layout: product, WH, UoM, req/quoted dates & qtys, price, disc, net, total, actions */
const PQ_PRODUCT_HEADER_KEYS = [
  "h-product",
  "h-whse",
  "h-uom",
  "h-req-date",
  "h-quoted-date",
  "h-req-qty",
  "h-quoted-qty",
  "h-price",
  "h-disc-percent",
  "h-disc-amount",
  "h-net",
  "h-total",
  "h-actions",
] as const;

function Pulse({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded bg-linen-100 [animation-duration:1.1s] ${className}`} />
  );
}

/** Skeleton replica of a FieldBlock: label + h-10 input with search button icon placeholder */
function FieldSkeleton({ showSearch = true }: { showSearch?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Pulse className="h-2.5 w-24" />
      <div className="relative">
        <Pulse className="h-10 w-full rounded-xl" />
        {/* Search icon pill placeholder */}
        {showSearch && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Pulse className="size-7 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}

/** Skeleton for a date picker button: label + h-10 button with calendar icon placeholder */
function DatePickerSkeleton() {
  return (
    <div className="space-y-1.5">
      <Pulse className="h-2.5 w-20" />
      <div className="relative">
        <Pulse className="h-10 w-full rounded-xl" />
        {/* Calendar icon pill placeholder */}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <Pulse className="size-7 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton for a plain text input (no icon): label + h-[74px] textarea */
function InputSkeleton({ height = "h-[74px]" }: { height?: string }) {
  return (
    <div className="space-y-1.5">
      <Pulse className="h-2.5 w-28" />
      <Pulse className={`${height} w-full rounded-xl`} />
    </div>
  );
}

/** Skeleton for the CopyFromDropdown trigger button in the page wrapper's topActions slot. */
function CopyFromButtonSkeleton() {
  return (
    <div className="flex h-8 items-center gap-1.5 rounded-lg border border-linen-200 bg-surface px-2.5 shadow-sm">
      <Pulse className="size-3.5 rounded-sm bg-linen-100" />
      <Pulse className="h-3 w-16" />
      <div className="mx-1.5 h-3.5 w-px bg-linen-100" />
      <Pulse className="h-3 w-20" />
      <Pulse className="size-3 rounded-sm bg-linen-100" />
    </div>
  );
}

function SectionShell({
  titleWidth,
  className = "",
  children,
}: {
  titleWidth: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`h-full overflow-visible rounded-2xl border border-linen-200 bg-surface ${className}`.trim()}
    >
      <div className="rounded-t-2xl border-b border-linen-100 px-4 py-2.5">
        <Pulse className={`h-3.5 ${titleWidth}`} />
      </div>
      <div className="space-y-3 rounded-b-2xl bg-surface px-4 py-3">{children}</div>
    </section>
  );
}

export function CreatePageRouteSkeleton() {
  const location = useLocation();
  const pathname = location.pathname.toLowerCase();
  const isEdit = pathname.includes("/edit") || pathname.includes("/update");
  const isRfq = pathname.includes("request-for-quotation");
  const isQuotation = pathname.includes("quotation") || isRfq;
  /** PQ / RFQ use required+quoted date columns and locked-style fields. */
  const isPqStyle = isQuotation || isRfq;
  const hasCopyFrom = !isEdit && !isQuotation;
  const productHeaders = isPqStyle ? PQ_PRODUCT_HEADER_KEYS : PRODUCT_HEADER_KEYS;
  const fieldsLocked = isEdit || isRfq;

  return (
    <div
      className="relative w-full bg-linen-50 p-3 pb-20"
      aria-busy="true"
      aria-label="Loading form"
    >
      {/* Top Actions placeholder (Copy From) */}
      {hasCopyFrom && (
        <div className="absolute right-3 top-3 z-10">
          <CopyFromButtonSkeleton />
        </div>
      )}

      {/* Breadcrumb bar */}
      <div className="mb-3 inline-flex flex-wrap items-center gap-1.5 rounded-full border border-linen-200/60 bg-linen-50/50 px-3.5 py-1.5 text-xs font-medium text-neutral-500 transition-all duration-300 hover:border-linen-200/80 hover:bg-surface hover:shadow-xs">
        <Pulse className="h-3 w-16" />
        <Pulse className="size-3 rounded-sm bg-linen-100" />
        <Pulse className="h-3 w-20" />
        <Pulse className="size-3 rounded-sm bg-linen-100" />
        <Pulse className="h-3 w-36" />
        <Pulse className="size-3 rounded-sm bg-linen-100" />
        <Pulse className="h-3 w-28" />
      </div>

      {/* Relationship Map Placeholder for Edit Pages */}
      {isEdit && (
        <div className="mb-4 mt-2 w-full overflow-hidden">
          <div className="w-full min-w-[400px] rounded-xl border border-linen-200 bg-surface px-4 py-3 shadow-sm">
            <Pulse className="mb-3 h-3 w-40" />
            <div className="flex items-center justify-between gap-1">
              <div className="flex flex-col items-center gap-1">
                <Pulse className="size-7 rounded-full" />
                <Pulse className="h-2 w-16" />
              </div>
              <div className="h-[2px] flex-1 bg-linen-100" />
              <div className="flex flex-col items-center gap-1">
                <Pulse className="size-7 rounded-full" />
                <Pulse className="h-2 w-16" />
              </div>
              <div className="h-[2px] flex-1 bg-linen-100" />
              <div className="flex flex-col items-center gap-1">
                <Pulse className="size-7 rounded-full" />
                <Pulse className="h-2 w-16" />
              </div>
              <div className="h-[2px] flex-1 bg-linen-100" />
              <div className="flex flex-col items-center gap-1">
                <Pulse className="size-7 rounded-full" />
                <Pulse className="h-2 w-16" />
              </div>
              <div className="h-[2px] flex-1 bg-linen-100" />
              <div className="flex flex-col items-center gap-1">
                <Pulse className="size-7 rounded-full" />
                <Pulse className="h-2 w-16" />
              </div>
              <div className="h-[2px] flex-1 bg-linen-100" />
              <div className="flex flex-col items-center gap-1">
                <Pulse className="size-7 rounded-full" />
                <Pulse className="h-2 w-16" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Row 1: VendorCustomer | Logistics | DocumentDates */}
      <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        {/* VendorCustomerGrid: 2 FieldBlocks (Name + Code) */}
        <SectionShell titleWidth="w-28">
          <FieldSkeleton showSearch={!fieldsLocked} />
          <FieldSkeleton showSearch={!fieldsLocked} />
        </SectionShell>

        {/* LogisticsGrid: Warehouse + Buyer FieldBlock */}
        <SectionShell titleWidth="w-36">
          {/* Warehouse field */}
          <FieldSkeleton showSearch={!fieldsLocked} />
          {/* Buyer field */}
          <FieldSkeleton showSearch={!fieldsLocked} />
        </SectionShell>

        {/* DocumentDatesGrid: Doc Date + Valid Until (+ Required Date for PQ/RFQ) */}
        <SectionShell titleWidth="w-32">
          <div className="grid grid-cols-1 gap-4">
            <DatePickerSkeleton />
            <DatePickerSkeleton />
            {isPqStyle ? <DatePickerSkeleton /> : null}
          </div>
        </SectionShell>
      </div>

      {/* Row 2: AddressGrid (span-2) | ReferenceGrid */}
      <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        {/* AddressGrid: 2-col layout, each with h-8.5 trigger + h-36 textarea */}
        <SectionShell titleWidth="w-20" className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Pulse className="h-2.5 w-24" />
              <Pulse className="h-8.5 w-full rounded-lg" />
              <Pulse className="h-36 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Pulse className="h-2.5 w-24" />
              <Pulse className="h-8.5 w-full rounded-lg" />
              <Pulse className="h-36 w-full rounded-xl" />
            </div>
          </div>
        </SectionShell>

        {/* ReferenceGrid: Customer Ref No (h-[74px]) + Remarks (h-[74px]) */}
        <SectionShell titleWidth="w-24">
          <InputSkeleton />
          <InputSkeleton />
        </SectionShell>
      </div>

      {/* Row 3: Attachments Section (UploadGrid) */}
      <div className="mt-3">
        <SectionShell titleWidth="w-28">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-auto md:h-[108px] items-stretch w-full">
            <Pulse className="md:col-span-4 h-[108px] rounded-xl" />
            <div className="md:col-span-8 flex flex-col gap-2 h-full">
              <Pulse className="h-[48px] rounded-xl" />
              <Pulse className="h-[48px] rounded-xl" />
            </div>
          </div>
        </SectionShell>
      </div>

      {/* Product Details Section */}
      <section className="mt-3 rounded-2xl border border-linen-200 bg-surface">
        {/* Section header: title + search button (hidden on RFQ seller fill) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linen-100 px-4 py-3">
          <Pulse className="h-4 w-32" />
          {!isRfq ? <Pulse className="h-11 w-40 rounded-xl" /> : null}
        </div>

        {/* Table */}
        <div className="overflow-x-auto px-2 py-2">
          <table
            className={`w-full text-left text-sm text-ink-900 ${
              isPqStyle ? "min-w-[1680px]" : "min-w-245"
            }`}
          >
            <thead className="bg-linen-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              <tr>
                {productHeaders.map((key) => (
                  <th key={key} className="whitespace-nowrap px-3 py-2">
                    <Pulse className="h-3 w-14" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRODUCT_ROW_KEYS.map((rowKey) => (
                <tr key={rowKey} className="border-b border-linen-100 last:border-b-0">
                  {isPqStyle ? (
                    <>
                      <td className="px-3 py-2">
                        <Pulse className="h-4 w-40" />
                      </td>
                      <td className="px-3 py-2">
                        <Pulse className="h-9 w-24 rounded-lg" />
                      </td>
                      <td className="px-3 py-2">
                        <Pulse className="h-9 w-14 rounded-lg" />
                      </td>
                      <td className="px-3 py-2">
                        <Pulse className="h-9 w-20 rounded-lg" />
                      </td>
                      <td className="px-3 py-2">
                        <Pulse className="h-9 w-20 rounded-lg" />
                      </td>
                      <td className="px-3 py-2">
                        <Pulse className="h-9 w-14 rounded-lg" />
                      </td>
                      <td className="px-3 py-2">
                        <Pulse className="h-9 w-14 rounded-lg" />
                      </td>
                      <td className="px-3 py-2">
                        <Pulse className="h-9 w-16 rounded-lg" />
                      </td>
                      <td className="px-3 py-2">
                        <Pulse className="h-9 w-14 rounded-lg" />
                      </td>
                      <td className="px-3 py-2">
                        <Pulse className="h-9 w-16 rounded-lg" />
                      </td>
                      <td className="px-3 py-2">
                        <Pulse className="h-4 w-14" />
                      </td>
                      <td className="px-3 py-2">
                        <Pulse className="h-4 w-16" />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Pulse className="ml-auto h-9 w-9 rounded-lg" />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2">
                        <Pulse className="h-4 w-56" />
                      </td>
                      <td className="px-3 py-2">
                        <Pulse className="h-9 w-16 rounded-lg" />
                      </td>
                      <td className="px-3 py-2">
                        <Pulse className="h-4 w-16" />
                      </td>
                      <td className="px-3 py-2">
                        <Pulse className="h-9 w-16 rounded-lg" />
                      </td>
                      <td className="px-3 py-2">
                        <Pulse className="h-9 w-20 rounded-lg" />
                      </td>
                      <td className="px-3 py-2">
                        <Pulse className="h-4 w-16" />
                      </td>
                      <td className="px-3 py-2">
                        <Pulse className="h-4 w-20" />
                      </td>
                      <td className="px-3 py-2">
                        <Pulse className="h-9 w-36 rounded-lg" />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Pulse className="ml-auto h-9 w-20 rounded-lg" />
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer: totals + action buttons */}
        <div className="border-t border-linen-100 px-4 py-3">
          {/* Totals */}
          <div className="ml-auto w-full max-w-sm">
            <div className="space-y-1">
              <div className="flex items-center justify-end gap-3 border-b border-linen-200/80 py-1">
                <Pulse className="h-3 w-16" />
                <Pulse className="h-3 w-10" />
                <Pulse className="h-4 w-20" />
              </div>
              <div className="flex items-center justify-end gap-3 border-b border-linen-200/80 py-1">
                <Pulse className="h-3 w-16" />
                <Pulse className="h-3 w-10" />
                <Pulse className="h-4 w-20" />
              </div>
              <div className="flex items-center justify-end gap-3 py-1">
                <Pulse className="h-3 w-20" />
                <Pulse className="h-3 w-10" />
                <Pulse className="h-5 w-20" />
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            {isRfq ? (
              <>
                <span />
                <Pulse className="h-11 w-28 rounded-xl" />
              </>
            ) : (
              <>
                <Pulse className="h-11 w-56 rounded-xl" />
                <div className="flex items-center gap-2">
                  <Pulse className={`h-11 rounded-xl ${isEdit ? "w-[180px]" : "w-52"}`} />
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
