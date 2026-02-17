import { FieldBlock } from '@/components/create/core/field-block'
import { SectionCard } from '@/components/create/core/section-card'
import { SuggestionList } from '@/components/create/core/suggestion-list'
import { type CreateLookupOption } from '@/features/create-pages/create-shared/utils/create-order.types'

type VendorCustomerGridProps = {
  loading: boolean
  error: string | null
  sectionTitle?: string
  nameLabel?: string
  codeLabel?: string
  namePlaceholder?: string
  codePlaceholder?: string
  nameLoadingPlaceholder?: string
  codeLoadingPlaceholder?: string
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
}

export function VendorCustomerGrid({
  loading,
  error,
  sectionTitle = 'Vendor Info',
  nameLabel = 'Vendor Name *',
  codeLabel = 'Vendor Code *',
  namePlaceholder = 'Select or Type Vendor',
  codePlaceholder = 'Select or Type Code',
  nameLoadingPlaceholder = 'Loading vendor names...',
  codeLoadingPlaceholder = 'Loading vendor codes...',
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
          loadingPlaceholder={nameLoadingPlaceholder}
          value={nameInput}
          onChange={onNameChange}
          onFocus={onNameFocus}
          onBlur={onNameBlur}
          onOpenPopup={onOpenNamePopup}
          loading={loading}
          invalid={vendorNameInvalid}
          errorText={vendorNameErrorText}
        />
        {nameFocused ? (
          <SuggestionList items={nameSuggestions} onSelect={onSelectVendor} floating />
        ) : null}
      </div>

      <div className="relative">
        <FieldBlock
          label={codeLabel}
          placeholder={codePlaceholder}
          loadingPlaceholder={codeLoadingPlaceholder}
          value={codeInput}
          onChange={onCodeChange}
          onFocus={onCodeFocus}
          onBlur={onCodeBlur}
          onOpenPopup={onOpenCodePopup}
          loading={loading}
          invalid={vendorCodeInvalid}
          errorText={vendorCodeErrorText}
        />
        {codeFocused ? (
          <SuggestionList items={codeSuggestions} onSelect={onSelectVendor} floating />
        ) : null}
      </div>
    </SectionCard>
  )
}
