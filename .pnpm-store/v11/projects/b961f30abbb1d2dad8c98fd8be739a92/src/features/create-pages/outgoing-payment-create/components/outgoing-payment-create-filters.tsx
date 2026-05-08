import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Check, Filter, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Calendar } from "@/components/calendar/calendar";
import { DebouncedInput } from "@/components/input/debounced-input";
import { Input } from "@/components/input/input";
import { LookupPopup } from "@/components/lookup/lookup-popup";
import { Popover } from "@/components/popover";
import { Select } from "@/components/select/select";
import type { LookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import {
  parseISODate,
  toISODate,
} from "@/features/create-pages/create-shared/utils/create-order.utils";
import type {
  OutgoingPaymentCreateDocument,
  OutgoingPaymentCreateFilterKey,
  OutgoingPaymentCreateFilterState,
} from "@/features/create-pages/outgoing-payment-create/components/outgoing-payment-create-filter.types";
import { outgoingPaymentQueries } from "@/features/table-pages/outgoing-payment/api/outgoing-payment.queries";
import {
  formatDateDisplay,
  rankLookupSuggestions,
  sortLookupByCodeDesc,
} from "@/features/table-pages/table-shared/components/filters/search/table-search.utils";
import { SuggestionsDropdown } from "@/features/table-pages/table-shared/components/filters/search/text-filter-search.components";
import {
  normalizeDocTotalInput,
  normalizeSearchInputByColumn,
} from "@/features/table-pages/table-shared/components/filters/table-search.validation";
import {
  hasDateRangeValue,
  toDateRangeFilter,
} from "@/features/table-pages/table-shared/utils/table-filter-values";
import type {
  DateRangeFilter,
  NumberComparisonOperator,
} from "@/features/table-pages/table-shared/utils/table-filter-values";
import { cn } from "@/shared/utils/cn";

type NumberComparisonDraft = OutgoingPaymentCreateFilterState["docTotal"];

const DOC_TYPE_OPTIONS: {
  value: OutgoingPaymentCreateFilterState["docType"];
  label: string;
}[] = [
  { label: "All", value: "all" },
  { label: "A/P Invoice", value: "it_PurchaseInvoice" },
  { label: "A/P Credit Memo", value: "it_PurchCredItnote" },
];

const ACTIVE_FILTER_WIDTH_CLASS = "w-[240px]";

const defaultComparisonDraft = (): OutgoingPaymentCreateFilterState["docTotal"] => ({
  operator: "eq",
  value: "",
});

const FILTER_KEYS: OutgoingPaymentCreateFilterKey[] = [
  "docType",
  "docNumber",
  "docDate",
  "docTotal",
  "balanceDue",
  "totalPayment",
];

function filterFieldHasValue(
  key: OutgoingPaymentCreateFilterKey,
  state: OutgoingPaymentCreateFilterState,
): boolean {
  switch (key) {
    case "docType": {
      return state.docType !== "all";
    }
    case "docNumber": {
      return state.docNumber.trim().length > 0;
    }
    case "docDate": {
      return hasDateRangeValue(state.docDate);
    }
    case "docTotal": {
      return state.docTotal.value.trim().length > 0;
    }
    case "balanceDue": {
      return state.balanceDue.value.trim().length > 0;
    }
    case "totalPayment": {
      return state.totalPayment.value.trim().length > 0;
    }
  }
}

function clearFilterField(
  state: OutgoingPaymentCreateFilterState,
  key: OutgoingPaymentCreateFilterKey,
): OutgoingPaymentCreateFilterState {
  return {
    ...state,
    ...(key === "docType" ? { docType: "all" as const } : {}),
    ...(key === "docNumber" ? { docNumber: "" } : {}),
    ...(key === "docDate" ? { docDate: toDateRangeFilter() } : {}),
    ...(key === "docTotal" ? { docTotal: defaultComparisonDraft() } : {}),
    ...(key === "balanceDue" ? { balanceDue: defaultComparisonDraft() } : {}),
    ...(key === "totalPayment" ? { totalPayment: defaultComparisonDraft() } : {}),
  };
}

type CreateFilterToggleAction =
  | { type: "activate" }
  | { type: "deactivate" }
  | { type: "clear"; nextActiveKey: OutgoingPaymentCreateFilterKey | null };

function resolveCreateFilterToggleAction(
  key: OutgoingPaymentCreateFilterKey,
  activeKey: OutgoingPaymentCreateFilterKey | null,
  state: OutgoingPaymentCreateFilterState,
): CreateFilterToggleAction {
  const hasValue = filterFieldHasValue(key, state);

  if (hasValue) {
    const remainingKeys = FILTER_KEYS.filter((k) => k !== key && filterFieldHasValue(k, state));
    const nextActiveKey = activeKey === key ? (remainingKeys[0] ?? null) : activeKey;
    return { nextActiveKey, type: "clear" };
  }

  if (activeKey === key) {
    return { type: "deactivate" };
  }

  return { type: "activate" };
}

function ComparisonField({
  label,
  value,
  placeholder,
  onChange,
  showLabel = true,
}: {
  label: string;
  value: NumberComparisonDraft;
  placeholder: string;
  onChange: (next: NumberComparisonDraft) => void;
  showLabel?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      {showLabel ? (
        <div className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {label}
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <div className="w-[96px] shrink-0">
          <Select
            value={value.operator}
            onValueChange={(nextValue) => {
              const nextOperator = nextValue as NumberComparisonOperator;
              if (nextOperator === "eq" || nextOperator === "lt" || nextOperator === "gt") {
                onChange({ ...value, operator: nextOperator });
              }
            }}
          >
            <Select.Trigger className="h-11 w-full rounded-xl border-zinc-200 bg-zinc-50/50 text-[13px] font-normal transition-all hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100">
              <span className="truncate text-zinc-900 font-normal">
                {value.operator === "eq" ? "=" : value.operator === "lt" ? "<" : ">"}
              </span>
              <Select.Icon>
                <svg
                  className="size-3.5 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner>
                <Select.Popup>
                  <Select.List>
                    <Select.Item value="eq">=</Select.Item>
                    <Select.Item value="lt">&lt;</Select.Item>
                    <Select.Item value="gt">&gt;</Select.Item>
                  </Select.List>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select>
        </div>

        <Input
          type="text"
          inputMode="decimal"
          value={value.value}
          onChange={(event) =>
            onChange({
              ...value,
              value: normalizeDocTotalInput(event.target.value),
            })
          }
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border-zinc-200 bg-zinc-50/50 text-[13px] font-normal transition-all hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
      </div>
    </div>
  );
}

function DocDateField({
  value,
  onChange,
  showLabel = true,
}: {
  value: DateRangeFilter;
  onChange: (next: DateRangeFilter) => void;
  showLabel?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) {
        return;
      }
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const label = useMemo(() => {
    if (value.from && value.to) {
      return `${formatDateDisplay(value.from)} - ${formatDateDisplay(value.to)}`;
    }
    if (value.from) {
      return formatDateDisplay(value.from);
    }
    if (value.to) {
      return formatDateDisplay(value.to);
    }
    return "Select Date...";
  }, [value.from, value.to]);

  const maxDate = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }, []);
  const isCalendarRangeSelection = (next: unknown): next is { from?: Date; to?: Date } => {
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      return false;
    }
    const candidate = next as { from?: unknown; to?: unknown };
    const fromValid = candidate.from === undefined || candidate.from instanceof Date;
    const toValid = candidate.to === undefined || candidate.to instanceof Date;
    return fromValid && toValid;
  };

  return (
    <div ref={containerRef} className="relative">
      {showLabel ? (
        <div className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          Doc Date
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "relative flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/50 text-[13px] font-normal text-zinc-800 outline-none transition-all hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100",
          showLabel ? "pl-4 pr-10" : "pl-4 pr-10",
        )}
      >
        <span
          className={cn("truncate", value.from || value.to ? "text-zinc-900" : "text-zinc-400")}
        >
          {label}
        </span>
      </button>
      <div
        className={cn(
          "pointer-events-none absolute right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500",
          showLabel ? "top-[31px]" : "top-1/2 -translate-y-1/2",
        )}
      >
        <CalendarIcon className="h-3.5 w-3.5" />
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2">
          <Calendar
            mode="range"
            maxDate={maxDate}
            selected={{
              from: value.from ? parseISODate(value.from) : undefined,
              to: value.to ? parseISODate(value.to) : undefined,
            }}
            onSelect={(next) => {
              if (!next) {
                onChange({});
                return;
              }

              if (!isCalendarRangeSelection(next)) {
                return;
              }

              const from = next.from ? toISODate(next.from) : undefined;
              const to = next.to ? toISODate(next.to) : undefined;
              const nextRange = toDateRangeFilter(from, to);
              onChange(nextRange);
              if (nextRange.from && nextRange.to) {
                setIsOpen(false);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

const DOC_NUM_SUGGESTION_LIMIT = 100;
const TEXT_FILTER_DEBOUNCE_MS = 700;
const POPUP_SEARCH_DEBOUNCE_MS = 300;

function DocNumberField({
  value,
  onChange,
  documents,
  showLabel = true,
}: {
  value: string;
  onChange: (next: string) => void;
  documents: OutgoingPaymentCreateDocument[];
  showLabel?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [liveValue, setLiveValue] = useState("");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupSearch, setPopupSearch] = useState("");
  const [debouncedPopupSearch, setDebouncedPopupSearch] = useState("");
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (popupTimerRef.current) {
        clearTimeout(popupTimerRef.current);
      }
    },
    [],
  );

  const effectiveInputValue = liveValue || value;
  const effectiveLiveValue = isFocused ? liveValue : effectiveInputValue;

  const docNumSuggestions = useMemo<LookupItem[]>(() => {
    const seen = new Set<string>();
    const result: LookupItem[] = [];
    for (const doc of documents) {
      const code = String(doc.docNum).trim();
      if (!code || seen.has(code)) {
        continue;
      }
      seen.add(code);
      result.push({ code, name: code });
    }
    return sortLookupByCodeDesc(result);
  }, [documents]);

  const filteredSuggestions = useMemo(() => {
    const term = effectiveLiveValue.trim().toLowerCase();
    if (!term) {
      return docNumSuggestions;
    }
    if (docNumSuggestions.length > 0) {
      return rankLookupSuggestions(docNumSuggestions, term, "code");
    }
    const typedValue = effectiveLiveValue.trim();
    return typedValue ? [{ code: typedValue, name: typedValue } as LookupItem] : [];
  }, [docNumSuggestions, effectiveLiveValue]);

  const applySearchImmediately = (next: string) => {
    const normalized = normalizeSearchInputByColumn("DocNum", next);
    setLiveValue(normalized);
    onChange(normalized === "" ? "" : normalized);
  };

  const handleSearchChange = (next: string | number) => {
    const strValue = String(next);
    const normalized = normalizeSearchInputByColumn("DocNum", strValue);
    setLiveValue(normalized);
    onChange(normalized === "" ? "" : normalized);
  };

  const shouldQueryPopupSearch = isPopupOpen && debouncedPopupSearch.trim().length >= 2;

  const { data: popupSearchData, isFetching: popupSearchFetching } = useQuery({
    ...outgoingPaymentQueries.docNumSuggestions(
      debouncedPopupSearch || undefined,
      DOC_NUM_SUGGESTION_LIMIT,
    ),
    enabled: shouldQueryPopupSearch,
  });

  const popupResults = useMemo<LookupItem[]>(() => {
    if (!isPopupOpen) {
      return [];
    }
    const term = popupSearch.trim();
    if (term.length >= 2 && popupSearchData?.data?.length) {
      const seen = new Set<string>();
      const result: LookupItem[] = [];
      for (const item of popupSearchData.data) {
        const code = item.code.trim();
        if (!code || seen.has(code)) {
          continue;
        }
        seen.add(code);
        result.push({ code, name: code });
      }
      return sortLookupByCodeDesc(result);
    }
    return docNumSuggestions;
  }, [isPopupOpen, popupSearch, popupSearchData, docNumSuggestions]);

  const isPopupLoading = shouldQueryPopupSearch && popupSearchFetching;

  const seedPopupState = (seed: string) => {
    setPopupSearch(seed);
    setDebouncedPopupSearch(seed);
  };

  const handleOpenPopup = () => {
    seedPopupState(effectiveInputValue.trim());
    setIsPopupOpen(true);
  };

  const handlePopupIntent = () => {
    if (!isPopupOpen) {
      seedPopupState(effectiveInputValue.trim());
    }
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setPopupSearch("");
    setDebouncedPopupSearch("");
  };

  const handlePopupSearchChange = (next: string) => {
    setPopupSearch(next);
    setLiveValue(next);
    setIsFocused(true);
    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
    }
    popupTimerRef.current = setTimeout(() => {
      setDebouncedPopupSearch(next);
    }, POPUP_SEARCH_DEBOUNCE_MS);
  };

  const handlePopupSelect = (item: LookupItem) => {
    handleClosePopup();
    applySearchImmediately(item.code);
  };

  return (
    <div className="relative">
      {showLabel ? (
        <div className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          Doc Number
        </div>
      ) : null}
      <div className="relative">
        <DebouncedInput
          value={effectiveInputValue}
          onChange={handleSearchChange}
          debounce={TEXT_FILTER_DEBOUNCE_MS}
          onInput={(event) => {
            setLiveValue(event.currentTarget.value);
            setIsFocused(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              setIsFocused(false);
              applySearchImmediately(event.currentTarget.value);
            } else if (event.key === "Escape") {
              setIsFocused(false);
            } else if (event.key === "Backspace" && value && !liveValue) {
              event.preventDefault();
              applySearchImmediately("");
            }
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          placeholder="Doc number"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-3 pr-10 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={handleOpenPopup}
            onPointerEnter={handlePopupIntent}
            onMouseEnter={handlePopupIntent}
            onFocus={handlePopupIntent}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 transition hover:bg-zinc-100"
            tabIndex={-1}
            title="Search popup"
          >
            <Search className="h-3 w-3" />
          </button>
        </div>
      </div>

      <SuggestionsDropdown
        isVisible={isFocused}
        suggestions={filteredSuggestions}
        activeColumnId="DocNum"
        query={effectiveLiveValue}
        onSelectSuggestion={(item) => {
          setIsFocused(false);
          applySearchImmediately(item.code);
        }}
      />

      <LookupPopup
        open={isPopupOpen}
        mode="vendor-code"
        search={popupSearch}
        results={popupResults}
        loading={isPopupLoading}
        error={null}
        title="Search Doc Number"
        searchPlaceholder="Search document number"
        onSearchChange={handlePopupSearchChange}
        onClose={handleClosePopup}
        onSelect={handlePopupSelect}
      />
    </div>
  );
}

export function OutgoingPaymentCreateFilters({
  value,
  onReset,
  activeFilterKey,
  onActiveFilterChange,
  onChange,
}: {
  value: OutgoingPaymentCreateFilterState;
  onReset: () => void;
  activeFilterKey: OutgoingPaymentCreateFilterKey | null;
  onActiveFilterChange: (next: OutgoingPaymentCreateFilterKey | null) => void;
  onChange: (next: OutgoingPaymentCreateFilterState) => void;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Open outgoing payment filters"
          className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition-all active:scale-[0.98] normal-case tracking-normal group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:border-blue-300 cursor-pointer hover:bg-zinc-50 hover:text-blue-600"
        >
          <span>Filter</span>
          <Filter className="size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 text-zinc-400 group-hover:text-blue-500" />
        </button>
      </Popover.Trigger>

      <OutgoingPaymentCreateFiltersContent
        value={value}
        onReset={onReset}
        activeFilterKey={activeFilterKey}
        onActiveFilterChange={onActiveFilterChange}
        onChange={onChange}
      />
    </Popover.Root>
  );
}

function OutgoingPaymentCreateFiltersContent({
  value,
  onReset,
  activeFilterKey,
  onActiveFilterChange,
  onChange,
}: {
  value: OutgoingPaymentCreateFilterState;
  onReset: () => void;
  activeFilterKey: OutgoingPaymentCreateFilterKey | null;
  onActiveFilterChange: (next: OutgoingPaymentCreateFilterKey | null) => void;
  onChange: (next: OutgoingPaymentCreateFilterState) => void;
}) {
  const { setOpen } = Popover.usePopoverContext();
  const filterSections = useMemo(
    () => [
      {
        active: activeFilterKey === "docType" || value.docType !== "all",
        key: "docType" as const,
        label: "Doc Type",
      },
      {
        active: activeFilterKey === "docNumber" || value.docNumber.trim().length > 0,
        key: "docNumber" as const,
        label: "Doc Number",
      },
      {
        active: activeFilterKey === "docDate" || hasDateRangeValue(value.docDate),
        key: "docDate" as const,
        label: "Doc Date",
      },
      {
        active: activeFilterKey === "docTotal" || value.docTotal.value.trim().length > 0,
        key: "docTotal" as const,
        label: "Doc Total",
      },
      {
        active: activeFilterKey === "balanceDue" || value.balanceDue.value.trim().length > 0,
        key: "balanceDue" as const,
        label: "Balance Due",
      },
      {
        active: activeFilterKey === "totalPayment" || value.totalPayment.value.trim().length > 0,
        key: "totalPayment" as const,
        label: "Total Payment",
      },
    ],
    [activeFilterKey, value],
  );

  return (
    <Popover.Content
      align="end"
      className="w-57.5 p-0 overflow-hidden border border-zinc-200 rounded-xl shadow-xl"
      unstyled
    >
      <div className="flex flex-col bg-white/95 backdrop-blur-xl">
        <div className="px-1.5 py-1.5">
          <div className="flex flex-col gap-px">
            {filterSections.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => {
                  const action = resolveCreateFilterToggleAction(
                    section.key,
                    activeFilterKey,
                    value,
                  );
                  if (action.type === "activate") {
                    onActiveFilterChange(section.key);
                  } else if (action.type === "deactivate") {
                    onActiveFilterChange(null);
                  } else if (action.type === "clear") {
                    onChange(clearFilterField(value, section.key));
                    onActiveFilterChange(action.nextActiveKey);
                  }
                  setOpen(false);
                }}
                className="group flex items-center justify-between rounded-md px-2 py-2 text-[12px] select-none border border-transparent transition-colors hover:bg-zinc-50 text-zinc-900"
              >
                <span
                  className={cn(
                    "truncate transition-colors cursor-pointer text-left flex-1",
                    section.active
                      ? "text-blue-500 font-medium"
                      : "text-zinc-700 font-medium hover:text-blue-600",
                  )}
                >
                  {section.label}
                </span>
                <span
                  className={cn(
                    "ml-2 flex items-center justify-center size-4 rounded border transition-all cursor-pointer shrink-0",
                    section.active
                      ? "bg-blue-500 border-blue-500 text-white shadow-sm"
                      : "border-zinc-300 bg-white text-transparent hover:border-blue-400 hover:bg-blue-50/50",
                  )}
                >
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-100/80 bg-zinc-50/30">
          <button
            type="button"
            onClick={() => {
              onReset();
              setOpen(false);
            }}
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 transition-all active:scale-[0.98] cursor-pointer"
          >
            <RotateCcw className="size-3" />
            <span>Reset to Default</span>
          </button>
        </div>
      </div>
    </Popover.Content>
  );
}

export function OutgoingPaymentCreateActiveFilter({
  value,
  onChange,
  activeFilterKey,
  documents,
}: {
  value: OutgoingPaymentCreateFilterState;
  onChange: (next: OutgoingPaymentCreateFilterState) => void;
  activeFilterKey: OutgoingPaymentCreateFilterKey | null;
  documents: OutgoingPaymentCreateDocument[];
}) {
  if (!activeFilterKey) {
    return null;
  }

  if (activeFilterKey === "docType") {
    const docTypeSelectValue = value.docType === "all" ? "" : value.docType;
    return (
      <div className={`${ACTIVE_FILTER_WIDTH_CLASS} shrink-0`}>
        <Select
          value={docTypeSelectValue}
          onValueChange={(nextValue) => {
            const docType =
              nextValue === ""
                ? "all"
                : (nextValue as Exclude<OutgoingPaymentCreateFilterState["docType"], "all">);
            onChange({ ...value, docType });
          }}
        >
          <Select.Trigger className="h-11 w-full rounded-xl border-zinc-200 bg-zinc-50/50 text-[13px] font-normal transition-all hover:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-blue-100">
            <Select.Value placeholder="All" />
            <Select.Icon>
              <svg
                className="size-4 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner>
              <Select.Popup>
                <Select.List>
                  {DOC_TYPE_OPTIONS.map((option) => (
                    <Select.Item
                      key={option.value}
                      value={option.value === "all" ? "" : option.value}
                    >
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select>
      </div>
    );
  }

  if (activeFilterKey === "docNumber") {
    return (
      <div className={`${ACTIVE_FILTER_WIDTH_CLASS} shrink-0`}>
        <DocNumberField
          value={value.docNumber}
          onChange={(next) => onChange({ ...value, docNumber: next })}
          documents={documents}
          showLabel={false}
        />
      </div>
    );
  }

  if (activeFilterKey === "docDate") {
    return (
      <div className={`${ACTIVE_FILTER_WIDTH_CLASS} shrink-0`}>
        <DocDateField
          value={value.docDate}
          onChange={(next) => onChange({ ...value, docDate: next })}
          showLabel={false}
        />
      </div>
    );
  }

  if (activeFilterKey === "docTotal") {
    return (
      <div className={`${ACTIVE_FILTER_WIDTH_CLASS} shrink-0`}>
        <ComparisonField
          label="Doc Total"
          value={value.docTotal}
          placeholder="Doc Total..."
          onChange={(next) => onChange({ ...value, docTotal: next })}
          showLabel={false}
        />
      </div>
    );
  }

  if (activeFilterKey === "balanceDue") {
    return (
      <div className={`${ACTIVE_FILTER_WIDTH_CLASS} shrink-0`}>
        <ComparisonField
          label="Balance Due"
          value={value.balanceDue}
          placeholder="Balance Due..."
          onChange={(next) => onChange({ ...value, balanceDue: next })}
          showLabel={false}
        />
      </div>
    );
  }

  return (
    <div className={`${ACTIVE_FILTER_WIDTH_CLASS} shrink-0`}>
      <ComparisonField
        label="Total Payment"
        value={value.totalPayment}
        placeholder="Total Payment..."
        onChange={(next) => onChange({ ...value, totalPayment: next })}
        showLabel={false}
      />
    </div>
  );
}
