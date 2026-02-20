import { Search, X } from 'lucide-react'
import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useState } from 'react'

import { DebouncedInput } from '@/components/input/debounced-input'
import { type LookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import {
  ALPHANUMERIC_COLUMN_IDS,
  ALPHANUMERIC_MAX_LENGTH,
  ALPHANUMERIC_MIN_LENGTH,
  LETTERS_SYMBOLS_COLUMN_IDS,
  LETTERS_SYMBOLS_MAX_LENGTH,
  LETTERS_SYMBOLS_MIN_LENGTH,
  normalizeSearchInputByColumn,
  NUMBER_ONLY_COLUMN_IDS,
  NUMBER_ONLY_MAX_LENGTH,
  NUMBER_ONLY_MIN_LENGTH,
} from '@/features/table-pages/shared/components/filters/table-search.validation'
import { cn } from '@/shared/utils/cn'

import { type TextFilterSearchProps } from './table-search.types'
import { sortLookupByCodeDesc } from './table-search.utils'

const CARD_CODE_COLUMNS = new Set(['CardCode'])
const CARD_NAME_COLUMNS = new Set(['CardName'])
const DOC_NUM_COLUMNS = new Set(['DocNum'])
const LOOKUP_STYLE_COLUMNS = new Set(['DocNum', 'CardCode', 'CardName'])
const TEXT_FILTER_DEBOUNCE_MS = 700

export function TextFilterSearch<TData>({
  table,
  activeColumn,
  activeColumnId,
  activeFilterValue,
  suggestions,
  docNumSuggestions,
  enableDocNumPopup,
  preserveDocNumSuggestionOrder = false,
  onSelectSuggestion,
  onPopupOpen,
  externalSelection,
  className,
}: TextFilterSearchProps<TData>) {
  const [searchState, setSearchState] = useState({ value: '', liveValue: '' })
  const [isFocused, setIsFocused] = useState(false)

  // Sync state from prop (fallback for non-popup filter changes)
  useEffect(() => {
    const nextValue =
      activeFilterValue === undefined || activeFilterValue === null ? '' : String(activeFilterValue)

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchState((prev) =>
      prev.value === nextValue && prev.liveValue === nextValue
        ? prev
        : { value: nextValue, liveValue: nextValue },
    )
  }, [activeFilterValue])

  /**
   * Direct sync from popup selection — bypasses async URL navigation round-trip.
   * When a popup selects an item, immediately update the input value without
   * waiting for the filter state to propagate through URL params.
   */
  useEffect(() => {
    if (!externalSelection) return
    if (externalSelection.columnId !== activeColumnId) return
    const displayValue = CARD_NAME_COLUMNS.has(activeColumnId)
      ? externalSelection.item.name
      : externalSelection.item.code
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchState({ value: displayValue, liveValue: displayValue })
    setIsFocused(false)
  }, [externalSelection, activeColumnId])

  const tableDocNumSuggestions = useMemo(() => {
    if (!DOC_NUM_COLUMNS.has(activeColumnId)) return []
    const unique = new Set<string>()
    const values: LookupItem[] = []
    for (const row of table.getRowModel().rows) {
      const raw = row.getValue(activeColumnId)
      const value = raw === null || raw === undefined ? '' : String(raw).trim()
      if (!value || unique.has(value)) continue
      unique.add(value)
      values.push({ code: value, name: value })
    }
    return preserveDocNumSuggestionOrder ? values : sortLookupByCodeDesc(values)
  }, [table, activeColumnId, preserveDocNumSuggestionOrder])

  const showSuggestions =
    isFocused &&
    (CARD_CODE_COLUMNS.has(activeColumnId) ||
      CARD_NAME_COLUMNS.has(activeColumnId) ||
      DOC_NUM_COLUMNS.has(activeColumnId))

  const filteredSuggestions = useMemo(() => {
    if (!showSuggestions) return []
    const term = searchState.liveValue.trim().toLowerCase()

    if (DOC_NUM_COLUMNS.has(activeColumnId)) {
      let source: LookupItem[] = []
      if (preserveDocNumSuggestionOrder) {
        // Merge current table matches with background suggestions to ensure "all" are shown
        const seen = new Set(tableDocNumSuggestions.map((m) => m.code))
        source = [...tableDocNumSuggestions]
        for (const item of docNumSuggestions) {
          if (!seen.has(item.code)) {
            seen.add(item.code)
            source.push(item)
          }
        }
        // If still empty, use whatever we have
        if (source.length === 0)
          source = docNumSuggestions.length > 0 ? docNumSuggestions : tableDocNumSuggestions
      } else {
        source =
          docNumSuggestions.length > 0
            ? sortLookupByCodeDesc(docNumSuggestions)
            : tableDocNumSuggestions
      }

      if (!term) return source
      const matches = source.filter((item) => item.code.toLowerCase().includes(term))
      if (matches.length > 0) return matches
      const typedValue = searchState.liveValue.trim()
      return typedValue ? [{ code: typedValue, name: typedValue }] : []
    }

    if (!term) return suggestions
    if (CARD_CODE_COLUMNS.has(activeColumnId)) {
      return suggestions.filter((item) => item.code.toLowerCase().includes(term))
    }
    if (CARD_NAME_COLUMNS.has(activeColumnId)) {
      return suggestions.filter((item) => item.name.toLowerCase().includes(term))
    }
    return suggestions.filter(
      (item) => item.code.toLowerCase().includes(term) || item.name.toLowerCase().includes(term),
    )
  }, [
    showSuggestions,
    suggestions,
    searchState.liveValue,
    activeColumnId,
    docNumSuggestions,
    preserveDocNumSuggestionOrder,
    tableDocNumSuggestions,
  ])

  const isDocNumberColumn = activeColumnId === 'DocNum'
  const isDocLookupStyleColumn = LOOKUP_STYLE_COLUMNS.has(activeColumnId)
  const canOpenLookupPopup =
    !!onPopupOpen &&
    (CARD_CODE_COLUMNS.has(activeColumnId) ||
      CARD_NAME_COLUMNS.has(activeColumnId) ||
      (enableDocNumPopup && DOC_NUM_COLUMNS.has(activeColumnId)))

  const searchPlaceholder = isDocLookupStyleColumn ? 'Type or select...' : 'Search...'

  const handleSearchChange = (value: string | number) => {
    const strValue = String(value)
    const normalizedValue = normalizeSearchInputByColumn(activeColumnId, strValue)
    setSearchState({ value: normalizedValue, liveValue: normalizedValue })
    activeColumn.setFilterValue(normalizedValue === '' ? undefined : normalizedValue)
  }

  const applySearchImmediately = (value: string) => {
    const normalizedValue = normalizeSearchInputByColumn(activeColumnId, value)
    setSearchState({ value: normalizedValue, liveValue: normalizedValue })
    activeColumn.setFilterValue(normalizedValue === '' ? undefined : normalizedValue)
  }

  /**
   * Returns the display value for a lookup item based on the active column.
   * DocNum and CardCode use the item code; CardName uses the item name.
   */
  const getLookupDisplayValue = (item: LookupItem): string =>
    CARD_NAME_COLUMNS.has(activeColumnId) ? item.name : item.code

  /**
   * Applies a lookup item selection uniformly across all lookup column types.
   * For CardCode/CardName, also syncs the partner column.
   */
  const applyLookupSelection = (item: LookupItem) => {
    setIsFocused(false)
    const displayValue = getLookupDisplayValue(item)

    // Cross-column sync for vendor columns
    if (CARD_CODE_COLUMNS.has(activeColumnId) || CARD_NAME_COLUMNS.has(activeColumnId)) {
      const codeColumn = table.getColumn('CardCode')
      const nameColumn = table.getColumn('CardName')
      if (codeColumn) codeColumn.setFilterValue(item.code)
      if (nameColumn) nameColumn.setFilterValue(item.name)
    }

    applySearchImmediately(displayValue)
    onSelectSuggestion?.(item, activeColumnId)
  }

  const handleSelectSuggestion = (item: LookupItem) => applyLookupSelection(item)

  const handleClearInput = () => {
    // For vendor columns, also clear the partner column
    if (CARD_CODE_COLUMNS.has(activeColumnId) || CARD_NAME_COLUMNS.has(activeColumnId)) {
      const codeColumn = table.getColumn('CardCode')
      const nameColumn = table.getColumn('CardName')
      if (codeColumn) codeColumn.setFilterValue(undefined)
      if (nameColumn) nameColumn.setFilterValue(undefined)
    }
    // Unified clear — applies to DocNum and vendor columns alike
    applySearchImmediately('')
    // Reopen suggestions for all lookup-style columns
    if (isDocLookupStyleColumn) {
      setIsFocused(true)
    }
  }

  const handleOpenPopup = () => {
    if (onPopupOpen && canOpenLookupPopup) {
      onPopupOpen(activeColumnId, searchState.liveValue)
    }
  }

  return (
    <div className={cn('relative w-full group', className)}>
      {!isDocLookupStyleColumn ? (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-within:text-blue-600 transition-colors pointer-events-none">
          <Search className="size-3.5" />
        </div>
      ) : null}
      <DebouncedInput
        value={searchState.value}
        onChange={handleSearchChange}
        debounce={TEXT_FILTER_DEBOUNCE_MS}
        onInput={(event: FormEvent<HTMLInputElement>) => {
          const value = event.currentTarget.value
          setSearchState((prev) => ({ ...prev, liveValue: value }))
          if (isDocLookupStyleColumn) {
            setIsFocused(true)
          }
        }}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter') {
            setIsFocused(false)
            const value = event.currentTarget.value
            applySearchImmediately(value)
          } else if (event.key === 'Escape') {
            setIsFocused(false)
          }
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 150)}
        placeholder={searchPlaceholder}
        inputMode={NUMBER_ONLY_COLUMN_IDS.has(activeColumnId) ? 'numeric' : undefined}
        pattern={
          NUMBER_ONLY_COLUMN_IDS.has(activeColumnId)
            ? '[0-9]*'
            : ALPHANUMERIC_COLUMN_IDS.has(activeColumnId)
              ? '[A-Za-z0-9]*'
              : LETTERS_SYMBOLS_COLUMN_IDS.has(activeColumnId)
                ? '[^0-9]*'
                : undefined
        }
        minLength={
          NUMBER_ONLY_COLUMN_IDS.has(activeColumnId) ||
          ALPHANUMERIC_COLUMN_IDS.has(activeColumnId) ||
          LETTERS_SYMBOLS_COLUMN_IDS.has(activeColumnId)
            ? NUMBER_ONLY_COLUMN_IDS.has(activeColumnId)
              ? NUMBER_ONLY_MIN_LENGTH
              : ALPHANUMERIC_COLUMN_IDS.has(activeColumnId)
                ? ALPHANUMERIC_MIN_LENGTH
                : LETTERS_SYMBOLS_MIN_LENGTH
            : undefined
        }
        maxLength={
          NUMBER_ONLY_COLUMN_IDS.has(activeColumnId)
            ? NUMBER_ONLY_MAX_LENGTH
            : ALPHANUMERIC_COLUMN_IDS.has(activeColumnId)
              ? ALPHANUMERIC_MAX_LENGTH
              : LETTERS_SYMBOLS_COLUMN_IDS.has(activeColumnId)
                ? LETTERS_SYMBOLS_MAX_LENGTH
                : undefined
        }
        className={
          isDocLookupStyleColumn
            ? 'h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-3 pr-10 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200'
            : 'h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-11 pr-10 text-[13px] font-normal text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200'
        }
      />
      <div
        className={cn(
          'absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1',
          isDocLookupStyleColumn && 'gap-0',
        )}
      >
        {!isDocLookupStyleColumn && searchState.value && (
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault()
            }}
            onClick={handleClearInput}
            className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
            tabIndex={-1}
          >
            <X className="size-3.5" />
          </button>
        )}
        {isDocLookupStyleColumn ? (
          canOpenLookupPopup ? (
            <button
              type="button"
              onClick={handleOpenPopup}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-100"
              tabIndex={-1}
              title="Search popup"
            >
              <Search className="h-3 w-3" />
            </button>
          ) : isDocNumberColumn ? (
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault()
                setIsFocused(false)
                applySearchImmediately(searchState.liveValue)
              }}
              onClick={() => {
                setIsFocused(false)
                applySearchImmediately(searchState.liveValue)
              }}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400"
              tabIndex={-1}
              title="Search"
            >
              <Search className="h-3 w-3" />
            </button>
          ) : null
        ) : activeColumnId &&
          (CARD_CODE_COLUMNS.has(activeColumnId) || CARD_NAME_COLUMNS.has(activeColumnId)) ? (
          <button
            type="button"
            onClick={handleOpenPopup}
            className="p-1 text-zinc-400 hover:text-blue-600 transition-colors"
            tabIndex={-1}
            title="Search popup"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        ) : null}
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden py-1">
          <div className="max-h-64 overflow-auto">
            {filteredSuggestions.map((item) => {
              const isNameOnly = CARD_NAME_COLUMNS.has(activeColumnId)
              const displayValue = isNameOnly ? item.name : item.code

              return (
                <button
                  key={item.code}
                  type="button"
                  className="w-full px-4 py-2 text-left transition last:border-b-0 hover:bg-zinc-50 group/item"
                  onMouseDown={(event) => {
                    event.preventDefault()
                  }}
                  onClick={() => handleSelectSuggestion(item)}
                >
                  <span
                    className={cn(
                      'text-[13px] leading-5 transition-colors font-medium group-hover/item:text-blue-600',
                      isNameOnly ? 'text-zinc-800' : 'text-zinc-600',
                    )}
                  >
                    {displayValue}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
