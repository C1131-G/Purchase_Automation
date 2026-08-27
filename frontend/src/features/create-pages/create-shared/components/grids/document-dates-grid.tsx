import { Calendar as CalendarIcon, Lock } from "lucide-react";
import type { ComponentProps, ReactElement, RefObject } from "react";

import { Calendar } from "@/components/calendar/calendar";
// DocumentDatesGrid: Manages core document metadata (DocNum, Dates, Reference).
import { SectionCard } from "@/features/create-pages/create-shared/components/core/section-card";
import type { ActiveDatePicker } from "@/features/create-pages/create-shared/utils/create-order.types";

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
  /** ISO date: Valid Until cannot be before this date. */
  docDueDateMin?: string;
  docDueDateInvalid?: boolean;
  docDueDateErrorText?: string | undefined;
  error?: string | null;
  docDateReadOnly?: boolean;
  docDueDateReadOnly?: boolean;
  /** Visual-only override: read-only fields render with the same background as editable fields. */
  uniformReadOnlyAppearance?: boolean;
  docDueDateLabel?: string;
  docDueDatePlaceholder?: string;
  /** Optional third date (e.g. PQ Required Date). Same control size; denser stack when shown. */
  showRequiredDate?: boolean;
  requiredDate?: string;
  requiredDateContainerRef?: RefObject<HTMLDivElement | null>;
  onRequiredDateChange?: (value: string) => void;
  requiredDateReadOnly?: boolean;
  requiredDateInvalid?: boolean;
  requiredDateErrorText?: string | undefined;
  requiredDateLabel?: string;
  requiredDatePlaceholder?: string;
  /** When true, calendar only allows dates after `today` (strict future). */
  requiredDateFutureOnly?: boolean;
  /** ISO date: Required Date cannot be after this (PQ Valid Until). */
  requiredDateMax?: string;
  /** ISO date: Required/Quoted Date cannot be before this date. */
  requiredDateMin?: string;
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
  docDueDateMin = "",
  docDueDateInvalid,
  docDueDateErrorText,
  error,
  docDateReadOnly = false,
  docDueDateReadOnly = false,
  uniformReadOnlyAppearance: _uniformReadOnlyAppearance = false,
  docDueDateLabel = "DELIVERY DATE",
  docDueDatePlaceholder = "Select delivery date",
  showRequiredDate = false,
  requiredDate = "",
  requiredDateContainerRef,
  onRequiredDateChange,
  requiredDateReadOnly = false,
  requiredDateInvalid = false,
  requiredDateErrorText,
  requiredDateLabel = "REQUIRED DATE",
  requiredDatePlaceholder = "Select required date",
  requiredDateFutureOnly = true,
  requiredDateMax = "",
  requiredDateMin = "",
}: DocumentDatesGridProps) {
  const dueMinDate = docDueDateMin.trim() ? parseISODate(docDueDateMin) : today;
  const requiredBaseMinDate = requiredDateMin.trim() ? parseISODate(requiredDateMin) : today;
  const requiredMaxDate = requiredDateMax.trim() ? parseISODate(requiredDateMax) : undefined;
  const requiredMinDate = (() => {
    const min = new Date(
      requiredBaseMinDate.getFullYear(),
      requiredBaseMinDate.getMonth(),
      requiredBaseMinDate.getDate(),
    );
    if (requiredDateFutureOnly) {
      min.setDate(min.getDate() + 1);
    }
    if (requiredMaxDate && requiredMaxDate < min) {
      return requiredMaxDate;
    }
    return min;
  })();

  return (
    <SectionCard title="DOCUMENT DATES" className="lg:col-span-1">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
      <div className="flex flex-col gap-4">
        <div ref={docDateContainerRef} className="relative">
          <label
            htmlFor="po-doc-date"
            className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500"
          >
            <span className="inline-flex items-center gap-1.5">
              <span>DOC DATE</span>
              {docDateReadOnly ? (
                <Lock className="h-3 w-3 text-neutral-400" aria-hidden="true" />
              ) : null}
            </span>
          </label>
          {loading ? (
            <div className="h-10 animate-pulse rounded-xl border border-linen-200 bg-linen-100" />
          ) : (
            <button
              id="po-doc-date"
              type="button"
              disabled={docDateReadOnly}
              onClick={() => onSetActiveDatePicker((prev) => (prev === "doc" ? null : "doc"))}
              className={`relative flex h-10 w-full items-center justify-start rounded-xl border pl-3 pr-10 text-sm outline-none transition ${
                docDateReadOnly
                  ? "cursor-not-allowed border-linen-200 bg-field-silver text-ink-900 opacity-100"
                  : "cursor-pointer border-linen-200 bg-field-silver text-ink-900 hover:bg-surface focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
              }`}
            >
              <span>{toDisplayDate(docDate)}</span>
              <div
                className={`absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-linen-200 bg-surface text-neutral-500 transition ${
                  docDateReadOnly ? "opacity-60" : "hover:bg-linen-100"
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
            htmlFor="po-due-date"
            className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500"
          >
            <span className="inline-flex items-center gap-1.5">
              <span>{docDueDateLabel}</span>
              {docDueDateReadOnly ? (
                <Lock className="h-3 w-3 text-neutral-400" aria-hidden="true" />
              ) : null}
            </span>
          </label>
          {loading ? (
            <div className="h-10 animate-pulse rounded-xl border border-linen-200 bg-linen-100" />
          ) : (
            <button
              id="po-due-date"
              type="button"
              disabled={docDueDateReadOnly}
              onClick={() =>
                onSetActiveDatePicker((prev) => (prev === "delivery" ? null : "delivery"))
              }
              className={`relative flex h-10 w-full items-center justify-start rounded-xl border pl-3 pr-10 text-sm outline-none transition ${
                docDueDateInvalid
                  ? "border-red-300 bg-red-50 focus:border-red-400 focus:bg-surface focus:ring-2 focus:ring-red-200"
                  : docDueDateReadOnly
                    ? "cursor-not-allowed border-linen-200 bg-field-silver text-ink-900 opacity-100"
                    : "border-linen-200 bg-field-silver text-ink-900 hover:bg-surface focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
              }`}
            >
              <span className={docDueDate ? "text-ink-900" : "text-neutral-400"}>
                {docDueDate ? toDisplayDate(docDueDate) : docDueDatePlaceholder}
              </span>
              <div
                className={`absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-linen-200 bg-surface text-neutral-500 transition ${
                  docDueDateReadOnly ? "opacity-60" : "hover:bg-linen-100"
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
                minDate={dueMinDate}
                {...(docDueDate ? { selected: parseISODate(docDueDate) } : {})}
                onSelect={(value) => {
                  if (!(value instanceof Date)) {
                    return;
                  }
                  const next = toISODate(value);
                  if (docDueDateMin.trim() && next < docDueDateMin.trim().slice(0, 10)) {
                    return;
                  }
                  onDocDueDateChange(next);
                  onSetActiveDatePicker(null);
                }}
              />
            </div>
          ) : null}
          {docDueDateInvalid && docDueDateErrorText ? (
            <p className="mt-1 text-xs text-red-600">{docDueDateErrorText}</p>
          ) : null}
        </div>

        {showRequiredDate ? (
          <div ref={requiredDateContainerRef} className="relative">
            <label
              htmlFor="pq-required-date"
              className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500"
            >
              <span className="inline-flex items-center gap-1.5">
                <span>{requiredDateLabel}</span>
                {requiredDateReadOnly ? (
                  <Lock className="h-3 w-3 text-neutral-400" aria-hidden="true" />
                ) : null}
              </span>
            </label>
            {loading ? (
              <div className="h-10 animate-pulse rounded-xl border border-linen-200 bg-linen-100" />
            ) : (
              <button
                id="pq-required-date"
                type="button"
                disabled={requiredDateReadOnly}
                onClick={() =>
                  onSetActiveDatePicker((prev) => (prev === "required" ? null : "required"))
                }
                className={`relative flex h-10 w-full items-center justify-start rounded-xl border pl-3 pr-10 text-sm outline-none transition ${
                  requiredDateInvalid
                    ? "border-red-300 bg-red-50 focus:border-red-400 focus:bg-surface focus:ring-2 focus:ring-red-200"
                    : requiredDateReadOnly
                      ? "cursor-not-allowed border-linen-200 bg-field-silver text-ink-900 opacity-100"
                      : "cursor-pointer border-linen-200 bg-field-silver text-ink-900 hover:bg-surface focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
                }`}
              >
                <span className={requiredDate ? "text-ink-900" : "text-neutral-400"}>
                  {requiredDate ? toDisplayDate(requiredDate) : requiredDatePlaceholder}
                </span>
                <div
                  className={`absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-linen-200 bg-surface text-neutral-500 transition ${
                    requiredDateReadOnly ? "opacity-60" : "hover:bg-linen-100"
                  }`}
                >
                  <CalendarIcon className="h-3 w-3" />
                </div>
              </button>
            )}
            {activeDatePicker === "required" ? (
              <div className="absolute left-0 top-full z-40 mt-2">
                <CalendarWithBounds
                  mode="single"
                  minDate={requiredMinDate}
                  {...(requiredMaxDate ? { maxDate: requiredMaxDate } : {})}
                  {...(requiredDate ? { selected: parseISODate(requiredDate) } : {})}
                  onSelect={(value) => {
                    if (!(value instanceof Date)) {
                      return;
                    }
                    const next = toISODate(value);
                    if (requiredDateMax.trim() && next > requiredDateMax.trim().slice(0, 10)) {
                      return;
                    }
                    onRequiredDateChange?.(next);
                    onSetActiveDatePicker(null);
                  }}
                />
              </div>
            ) : null}
            {requiredDateInvalid && requiredDateErrorText ? (
              <p className="mt-1 text-xs text-red-600">{requiredDateErrorText}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
