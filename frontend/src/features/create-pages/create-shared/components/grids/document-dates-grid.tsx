import { Calendar as CalendarIcon, Lock, AlertTriangle } from "lucide-react";
import type { ComponentProps, ReactElement, RefObject } from "react";

import { Calendar } from "@/components/calendar/calendar";
// DocumentDatesGrid: Manages core document metadata (DocNum, Dates, Reference).
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";

type ActiveDatePicker = "doc" | "delivery" | null;

type CalendarWithBoundsProps = ComponentProps<typeof Calendar> & {
  minDate?: Date | undefined;
  maxDate?: Date | undefined;
};
const CalendarWithBounds = Calendar as unknown as (props: CalendarWithBoundsProps) => ReactElement;

interface DocumentDatesGridProps {
  docDate: string;
  docDueDate: string;
  loading?: boolean;
  today: Date;
  activeDatePicker: ActiveDatePicker;
  docDateContainerRef: RefObject<HTMLDivElement | null>;
  deliveryDateContainerRef: RefObject<HTMLDivElement | null>;
  toDisplayDate: (value: string | undefined) => string;
  parseISODate: (value: string | undefined) => Date;
  toISODate: (value: Date) => string;
  onSetActiveDatePicker: (
    value: ActiveDatePicker | ((previous: ActiveDatePicker) => ActiveDatePicker),
  ) => void;
  onDocDateChange: (value: string) => void;
  onDocDueDateChange: (value: string) => void;
  docDueDateInvalid?: boolean;
  docDueDateErrorText?: string | undefined;
  error?: string | null;
  docDateReadOnly?: boolean;
  docDueDateReadOnly?: boolean;
  /** Visual-only override: read-only fields render with the same background as editable fields. */
  uniformReadOnlyAppearance?: boolean;
  warningText?: string | null;
}

export function DocumentDatesGrid({
  docDate,
  docDueDate,
  loading = false,
  today,
  activeDatePicker,
  docDateContainerRef,
  deliveryDateContainerRef,
  toDisplayDate,
  parseISODate,
  toISODate,
  onSetActiveDatePicker,
  onDocDateChange,
  onDocDueDateChange,
  docDueDateInvalid,
  docDueDateErrorText,
  error,
  docDateReadOnly = false,
  docDueDateReadOnly = false,
  uniformReadOnlyAppearance = false,
  warningText = null,
}: DocumentDatesGridProps) {
  return (
    <SectionCard title="DOCUMENT DATES" className="lg:col-span-1">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4">
        <div ref={docDateContainerRef} className="relative">
          <label
            htmlFor="po-doc-date"
            className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500"
          >
            <span className="inline-flex items-center gap-1.5">
              <span>DOC DATE</span>
              {docDateReadOnly ? (
                <Lock className="h-3 w-3 text-zinc-400" aria-hidden="true" />
              ) : null}
            </span>
          </label>
          {loading ? (
            <div className="h-10 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100" />
          ) : (
            <button
              id="po-doc-date"
              type="button"
              disabled={docDateReadOnly}
              onClick={() => onSetActiveDatePicker((prev) => (prev === "doc" ? null : "doc"))}
              className={`relative flex h-10 w-full items-center justify-start rounded-xl border pl-3 pr-10 text-sm outline-none transition ${
                docDateReadOnly
                  ? uniformReadOnlyAppearance
                    ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-800 opacity-100"
                    : "cursor-not-allowed border-zinc-300 bg-zinc-100 text-zinc-500 opacity-100"
                  : "cursor-pointer border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
              }`}
            >
              <span>{toDisplayDate(docDate)}</span>
              <div
                className={`absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition ${
                  docDateReadOnly ? "opacity-60" : "hover:bg-zinc-100"
                }`}
              >
                <CalendarIcon className="h-3 w-3" />
              </div>
            </button>
          )}
          {activeDatePicker === "doc" ? (
            <div className="absolute left-0 top-full z-40 mt-2">
              <CalendarWithBounds
                mode="single"
                selected={parseISODate(docDate)}
                maxDate={today}
                onSelect={(value) => {
                  if (!(value instanceof Date)) {
                    return;
                  }
                  onDocDateChange(toISODate(value));
                  onSetActiveDatePicker(null);
                }}
              />
            </div>
          ) : null}
        </div>

        <div ref={deliveryDateContainerRef} className="relative">
          <label
            htmlFor="po-delivery-date"
            className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500"
          >
            <span className="inline-flex items-center gap-1.5">
              <span>DELIVERY DATE</span>
              {docDueDateReadOnly ? (
                <Lock className="h-3 w-3 text-zinc-400" aria-hidden="true" />
              ) : null}
            </span>
          </label>
          {loading ? (
            <div className="h-10 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100" />
          ) : (
            <button
              type="button"
              disabled={docDueDateReadOnly}
              onClick={() =>
                onSetActiveDatePicker((prev) => (prev === "delivery" ? null : "delivery"))
              }
              className={`relative flex h-10 w-full items-center justify-start rounded-xl border pl-3 pr-10 text-sm outline-none transition ${
                docDueDateInvalid
                  ? "border-red-300 bg-red-50 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-200"
                  : docDueDateReadOnly
                    ? uniformReadOnlyAppearance
                      ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-800 opacity-100"
                      : "cursor-not-allowed border-zinc-300 bg-zinc-100 text-zinc-500 opacity-100"
                    : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
              }`}
            >
              <span className={docDueDate ? "text-zinc-800" : "text-zinc-400"}>
                {docDueDate ? toDisplayDate(docDueDate) : "Select delivery date"}
              </span>
              <div
                className={`absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition ${
                  docDueDateReadOnly ? "opacity-60" : "hover:bg-zinc-100"
                }`}
              >
                <CalendarIcon className="h-3 w-3" />
              </div>
            </button>
          )}
          {activeDatePicker === "delivery" ? (
            <div className="absolute left-0 top-full z-40 mt-2">
              <CalendarWithBounds
                mode="single"
                minDate={today}
                {...(docDueDate ? { selected: parseISODate(docDueDate) } : {})}
                onSelect={(value) => {
                  if (!(value instanceof Date)) {
                    return;
                  }
                  onDocDueDateChange(toISODate(value));
                  onSetActiveDatePicker(null);
                }}
              />
            </div>
          ) : null}
          {docDueDateInvalid && docDueDateErrorText ? (
            <p className="mt-1 text-xs text-red-600">{docDueDateErrorText}</p>
          ) : null}
          {warningText ? (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200/60 bg-amber-50/50 p-2 text-xs leading-normal text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <span>{warningText}</span>
            </div>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}
