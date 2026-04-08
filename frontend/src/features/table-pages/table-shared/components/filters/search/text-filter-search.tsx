import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'

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
} from '@/features/table-pages/table-shared/components/filters/table-search.validation'
import { cn } from '@/shared/utils/cn'

import { type TextFilterSearchProps } from './table-search.types'
import { rankLookupSuggestions, sortLookupByCodeDesc } from './table-search.utils'
import {
  SearchActionButtons,
  SearchLeftIcon,
  SuggestionsDropdown,
} from './text-filter-search.components'

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
  onPopupIntent,
  externalSelection,
  className,
}: TextFilterSearchProps<TData>) {
  const initialLiveValue = useMemo(() => {
    return activeFilterValue === undefined || activeFilterValue === null
      ? ''
      : String(activeFilterValue)
  }, [activeFilterValue])

  const [liveValue, setLiveValue] = useState(initialLiveValue)
  const [isFocused, setIsFocused] = useState(false)
  const [explicitlyCleared, setExplicitlyCleared] = useState(false)

  // Sync liveValue when the active column changes (column switch) or when the filter
  // value changes to something materially different from what we're displaying.
  // This prevents stale state from leaking across columns while preserving the
  // displayed value during normal interaction.
  const prevActiveColumnIdRef = useRef<string | undefined>(activeColumnId)
  const prevActiveFilterValueRef = useRef<unknown>(activeFilterValue)

  useEffect(() => {
    const columnChanged = prevActiveColumnIdRef.current !== activeColumnId
    const filterChanged = prevActiveFilterValueRef.current !== activeFilterValue

    if (columnChanged) {
      prevActiveColumnIdRef.current = activeColumnId
      prevActiveFilterValueRef.current = activeFilterValue
      const newVal =
        activeFilterValue === undefined || activeFilterValue === null
          ? ''
          : String(activeFilterValue)
      setLiveValue(newVal)
      setExplicitlyCleared(false)
    } else if (filterChanged) {
      prevActiveFilterValueRef.current = activeFilterValue
      // Only sync if the filter was cleared externally (e.g., reset) and we haven't
      // explicitly cleared ourselves — this catches the reset-to-default case.
      const currentFilter =
        activeFilterValue === undefined || activeFilterValue === null ? '' : String(activeFilterValue)
      if (currentFilter === '' && !explicitlyCleared) {
        setLiveValue('')
      } else if (currentFilter !== '' && explicitlyCleared) {
        // Filter was re-applied after explicit clear — reset the flag.
        setExplicitlyCleared(false)
        setLiveValue(currentFilter)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeColumnId, activeFilterValue, explicitlyCleared])

  const mirroredExternalValue = useMemo(() => {
    if (!externalSelection || externalSelection.columnId !== activeColumnId) return null
    return CARD_NAME_COLUMNS.has(activeColumnId)
      ? externalSelection.item.name
      : externalSelection.item.code
  }, [externalSelection, activeColumnId])

  // liveValue is the stable source of truth for the input display.
  // It is set on column switch, on selection, on clear, and on external filter changes.
  // mirroredExternalValue is only used during active popup typing to sync typed text.
  const effectiveInputValue = liveValue || mirroredExternalValue || ''
  const effectiveLiveValue = isFocused ? liveValue : effectiveInputValue

  const tableDocNumSuggestions = useMemo(() => {
    if (!DOC_NUM_COLUMNS.has(activeColumnId)) return []
    const unique = new Set<string>()
    const values: LookupItem[] = []
    for (const row of table.getRowModel().rows) {
      const raw = row.getValue(activeColumnId)
      const value = raw === null || raw === undefined ? '' : String(raw).trim()
      if (!value || unique.has(value)) continue
      unique.add(value)

      // Suggestion Enhancement: Include vendor details from the same row if present.
      const cardCode = row.getValue('CardCode')
      const cardName = row.getValue('CardName')
      const name = cardCode ? `[${cardCode}] ${cardName || ''}`.trim() : value

      values.push({ code: value, name })
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
    const term = effectiveLiveValue.trim().toLowerCase()

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
      if (source.length > 0) return rankLookupSuggestions(source, term, 'code')
      const typedValue = effectiveLiveValue.trim()
      return typedValue ? [{ code: typedValue, name: typedValue }] : []
    }

    if (!term) return suggestions
    if (CARD_CODE_COLUMNS.has(activeColumnId)) {
      return rankLookupSuggestions(suggestions, term, 'code')
    }
    if (CARD_NAME_COLUMNS.has(activeColumnId)) {
      return rankLookupSuggestions(suggestions, term, 'name')
    }
    return rankLookupSuggestions(suggestions, term, 'both')
  }, [
    showSuggestions,
    suggestions,
    effectiveLiveValue,
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
    setLiveValue(normalizedValue)
    activeColumn.setFilterValue(normalizedValue === '' ? undefined : normalizedValue)
  }

  const applySearchImmediately = (value: string) => {
    const normalizedValue = normalizeSearchInputByColumn(activeColumnId, value)
    setLiveValue(normalizedValue)
    activeColumn.setFilterValue(normalizedValue === '' ? undefined : normalizedValue)
  }

  /**
   * Returns the display value for a lookup item based on the active column.
   * DocNum and CardCode use the item code; CardName uses the item name.
   */
  const getLookupDisplayValue = (item: LookupItem): string =>
    CARD_NAME_COLUMNS.has(activeColumnId) ? item.name : item.code

  /**
   * Applies a lookup item selection to the active column only.
   * Each column is independent — CardCode does not touch CardName, and vice versa.
   */
  const applyLookupSelection = (item: LookupItem) => {
    setIsFocused(false)
    const displayValue = getLookupDisplayValue(item)

    applySearchImmediately(displayValue)
    onSelectSuggestion?.(item, activeColumnId)
  }

  const handleSelectSuggestion = (item: LookupItem) => applyLookupSelection(item)

  const handleClearInput = () => {
    setExplicitlyCleared(true)
    applySearchImmediately('')
    // Reopen suggestions for all lookup-style columns
    if (isDocLookupStyleColumn) {
      setIsFocused(true)
    }
  }

  const handleOpenPopup = () => {
    if (onPopupOpen && canOpenLookupPopup) {
      onPopupOpen(activeColumnId, effectiveLiveValue)
    }
  }

  const handleLookupPopupIntent = () => {
    if (onPopupIntent && canOpenLookupPopup) {
      onPopupIntent(activeColumnId, effectiveLiveValue)
    }
  }

  return (
    <div className={cn('relative w-full group', className)}>
      <SearchLeftIcon visible={!isDocLookupStyleColumn} />
      <DebouncedInput
        value={effectiveInputValue}
        onChange={handleSearchChange}
        debounce={TEXT_FILTER_DEBOUNCE_MS}
        onInput={(event: FormEvent<HTMLInputElement>) => {
          const value = event.currentTarget.value
          setLiveValue(value)
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
        onFocus={() => {
          setLiveValue(effectiveInputValue)
          setIsFocused(true)
        }}
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
      <SearchActionButtons
        isDocLookupStyleColumn={isDocLookupStyleColumn}
        isDocNumberColumn={isDocNumberColumn}
        activeColumnId={activeColumnId}
        searchValue={effectiveInputValue}
        canOpenLookupPopup={canOpenLookupPopup}
        onClearInput={handleClearInput}
        onOpenPopup={handleOpenPopup}
        onPopupIntent={handleLookupPopupIntent}
        onDocNumberSearch={() => {
          setIsFocused(false)
          applySearchImmediately(effectiveLiveValue)
        }}
      />

      <SuggestionsDropdown
        isVisible={showSuggestions}
        suggestions={filteredSuggestions}
        activeColumnId={activeColumnId}
        query={effectiveLiveValue}
        onSelectSuggestion={handleSelectSuggestion}
      />
    </div>
  )
}
