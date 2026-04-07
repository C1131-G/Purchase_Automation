// VendorCustomerGrid: Bridges partner selection with the document header.
import { FieldBlock } from '@/features/create-pages/create-shared/components/core/field-block'
import { SectionCard } from '@/features/create-pages/create-shared/components/core/section-card'
import { SuggestionList } from '@/features/create-pages/create-shared/components/core/suggestion-list'
import { type CreateLookupOption } from '@/features/create-pages/create-shared/utils/create-order.types'

type VendorCustomerGridProps = {
  loading: boolean
  error: string | null
  sectionTitle?: string
  nameLabel?: string
  codeLabel?: string
  namePlaceholder?: string
  codePlaceholder?: string
  nameInput: string
  codeInput: string
  nameFocused: boolean
  codeFocused: boolean
  nameSuggestions: CreateLookupOption[]
  codeSuggestions: CreateLookupOption[]
  onNameChange: (value: string) => void
  onCodeChange: (value: string) => void
  onNameFocus: () => void
  onCodeFocus: () => void
  onNameBlur: () => void
  onCodeBlur: () => void
  onOpenNamePopup: () => void
  onOpenCodePopup: () => void
  onSelectVendor: (vendor: CreateLookupOption) => void
  vendorNameInvalid?: boolean | undefined
  vendorCodeInvalid?: boolean | undefined
  vendorNameErrorText?: string | undefined
  vendorCodeErrorText?: string | undefined
  nameDisabled?: boolean
  codeDisabled?: boolean
  nameEditableHighlight?: boolean
  codeEditableHighlight?: boolean
  uniformReadOnlyAppearance?: boolean
}

export function VendorCustomerGrid({
  loading,
  error,
  sectionTitle = 'VENDOR INFO',
  nameLabel = 'VENDOR NAME *',
  codeLabel = 'VENDOR CODE *',
  namePlaceholder = 'Select or Type Vendor',
  codePlaceholder = 'Select or Type Code',
  nameInput,
  codeInput,
  nameFocused,
  codeFocused,
  nameSuggestions,
  codeSuggestions,
  onNameChange,
  onCodeChange,
  onNameFocus,
  onCodeFocus,
  onNameBlur,
  onCodeBlur,
  onOpenNamePopup,
  onOpenCodePopup,
  onSelectVendor,
  vendorNameInvalid,
  vendorCodeInvalid,
  vendorNameErrorText,
  vendorCodeErrorText,
  nameDisabled = false,
  codeDisabled = false,
  nameEditableHighlight = false,
  codeEditableHighlight = false,
  uniformReadOnlyAppearance = false,
}: VendorCustomerGridProps) {
  return (
    <SectionCard title={sectionTitle} className="lg:col-span-1">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
      <div className="relative">
        <FieldBlock
          label={nameLabel}
          placeholder={namePlaceholder}
          value={nameInput}
          onChange={onNameChange}
          onFocus={onNameFocus}
          onBlur={onNameBlur}
          onOpenPopup={onOpenNamePopup}
          loading={loading}
          invalid={vendorNameInvalid}
          errorText={vendorNameErrorText}
          disabled={nameDisabled}
          editableHighlight={nameEditableHighlight}
          uniformReadOnlyAppearance={uniformReadOnlyAppearance}
        />
        {nameFocused ? (
          <SuggestionList
            items={nameSuggestions}
            onSelect={onSelectVendor}
            floating
            query={nameInput}
          />
        ) : null}
      </div>

      <div className="relative">
        <FieldBlock
          label={codeLabel}
          placeholder={codePlaceholder}
          value={codeInput}
          onChange={onCodeChange}
          onFocus={onCodeFocus}
          onBlur={onCodeBlur}
          onOpenPopup={onOpenCodePopup}
          loading={loading}
          invalid={vendorCodeInvalid}
          errorText={vendorCodeErrorText}
          disabled={codeDisabled}
          editableHighlight={codeEditableHighlight}
          uniformReadOnlyAppearance={uniformReadOnlyAppearance}
        />
        {codeFocused ? (
          <SuggestionList
            items={codeSuggestions}
            onSelect={onSelectVendor}
            floating
            query={codeInput}
          />
        ) : null}
      </div>
    </SectionCard>
  )
}
