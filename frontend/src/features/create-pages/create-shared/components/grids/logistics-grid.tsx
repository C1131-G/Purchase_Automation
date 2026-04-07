import { Lock } from 'lucide-react'

import { FieldBlock } from '@/features/create-pages/create-shared/components/core/field-block'
import { SectionCard } from '@/features/create-pages/create-shared/components/core/section-card'
import { SuggestionList } from '@/features/create-pages/create-shared/components/core/suggestion-list'
import { type CreateLookupOption } from '@/features/create-pages/create-shared/utils/create-order.types'

type LogisticsGridProps = {
  salesEmployeeInput: string
  salesEmployeesLoading: boolean
  salesEmployeeFocused: boolean
  salesEmployeeSuggestions: CreateLookupOption[]
  onSalesEmployeeChange: (value: string) => void
  onSalesEmployeeFocus: () => void
  onSalesEmployeeBlur: () => void
  onOpenSalesEmployeePopup: () => void
  onSelectSalesEmployee: (item: CreateLookupOption) => void
  salesEmployeeInvalid?: boolean | undefined
  salesEmployeeErrorText?: string | undefined
  salesEmployeeLabel?: string
  salesEmployeePlaceholder?: string
  error?: string | null
  salesEmployeeDisabled?: boolean
  salesEmployeeEditableHighlight?: boolean
  readOnly?: boolean
  uniformReadOnlyAppearance?: boolean
}

export function LogisticsGrid({
  salesEmployeeInput,
  salesEmployeesLoading,
  salesEmployeeFocused,
  salesEmployeeSuggestions,
  onSalesEmployeeChange,
  onSalesEmployeeFocus,
  onSalesEmployeeBlur,
  onOpenSalesEmployeePopup,
  onSelectSalesEmployee,
  salesEmployeeInvalid,
  salesEmployeeErrorText,
  salesEmployeeLabel = 'BUYER',
  salesEmployeePlaceholder = 'Select Buyer',
  error,
  salesEmployeeDisabled = false,
  salesEmployeeEditableHighlight = false,
  readOnly = false,
  uniformReadOnlyAppearance = false,
}: LogisticsGridProps) {
  return (
    <SectionCard title="DOCUMENT DETAILS" className="lg:col-span-1 min-h-[220px]">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <span>DOC NUMBER</span>
              {readOnly ? <Lock className="h-3 w-3 text-zinc-400" aria-hidden="true" /> : null}
            </span>
          </label>
          <div className="flex h-10 items-center justify-start rounded-xl border border-blue-200 bg-blue-50 pl-3 text-sm font-semibold text-blue-700">
            Generated on Save
          </div>
        </div>

        <div className="relative">
          <FieldBlock
            label={salesEmployeeLabel}
            placeholder={salesEmployeePlaceholder}
            value={salesEmployeeInput}
            onChange={onSalesEmployeeChange}
            onFocus={onSalesEmployeeFocus}
            onBlur={onSalesEmployeeBlur}
            onOpenPopup={onOpenSalesEmployeePopup}
            loading={salesEmployeesLoading}
            invalid={salesEmployeeInvalid}
            errorText={salesEmployeeErrorText}
            disabled={salesEmployeeDisabled}
            editableHighlight={salesEmployeeEditableHighlight}
            uniformReadOnlyAppearance={uniformReadOnlyAppearance}
          />
          {salesEmployeeFocused ? (
            <SuggestionList
              items={salesEmployeeSuggestions}
              onSelect={onSelectSalesEmployee}
              floating
              query={salesEmployeeInput}
            />
          ) : null}
        </div>
      </div>
    </SectionCard>
  )
}
