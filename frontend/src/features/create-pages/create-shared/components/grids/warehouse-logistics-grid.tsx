import { FieldBlock } from '@/features/create-pages/create-shared/components/core/field-block'
import { SectionCard } from '@/features/create-pages/create-shared/components/core/section-card'
import { SuggestionList } from '@/features/create-pages/create-shared/components/core/suggestion-list'
import { type CreateLookupOption } from '@/features/create-pages/create-shared/utils/create-order.types'

type WarehouseLogisticsGridProps = {
  warehouseInput: string
  salesEmployeeInput: string
  warehouseLoading: boolean
  salesEmployeesLoading: boolean
  warehouseFocused: boolean
  salesEmployeeFocused: boolean
  warehouseSuggestions: CreateLookupOption[]
  salesEmployeeSuggestions: CreateLookupOption[]
  onWarehouseChange: (value: string) => void
  onSalesEmployeeChange: (value: string) => void
  onWarehouseFocus: () => void
  onSalesEmployeeFocus: () => void
  onWarehouseBlur: () => void
  onSalesEmployeeBlur: () => void
  onOpenWarehousePopup: () => void
  onOpenSalesEmployeePopup: () => void
  onSelectWarehouse: (item: CreateLookupOption) => void
  onSelectSalesEmployee: (item: CreateLookupOption) => void
  warehouseInvalid?: boolean | undefined
  salesEmployeeInvalid?: boolean | undefined
  warehouseErrorText?: string | undefined
  salesEmployeeErrorText?: string | undefined
  salesEmployeeLabel?: string
  salesEmployeePlaceholder?: string
  salesEmployeeLoadingPlaceholder?: string
}

export function WarehouseLogisticsGrid({
  warehouseInput,
  salesEmployeeInput,
  warehouseLoading,
  salesEmployeesLoading,
  warehouseFocused,
  salesEmployeeFocused,
  warehouseSuggestions,
  salesEmployeeSuggestions,
  onWarehouseChange,
  onSalesEmployeeChange,
  onWarehouseFocus,
  onSalesEmployeeFocus,
  onWarehouseBlur,
  onSalesEmployeeBlur,
  onOpenWarehousePopup,
  onOpenSalesEmployeePopup,
  onSelectWarehouse,
  onSelectSalesEmployee,
  warehouseInvalid,
  salesEmployeeInvalid,
  warehouseErrorText,
  salesEmployeeErrorText,
  salesEmployeeLabel = 'Buyer *',
  salesEmployeePlaceholder = 'Select Buyer',
  salesEmployeeLoadingPlaceholder = 'Loading buyers...',
}: WarehouseLogisticsGridProps) {
  return (
    <SectionCard title="Warehouse & Logistics" className="lg:col-span-1">
      <div className="relative">
        <FieldBlock
          label="Warehouse *"
          placeholder="Select Warehouse"
          loadingPlaceholder="Loading warehouses..."
          value={warehouseInput}
          onChange={onWarehouseChange}
          onFocus={onWarehouseFocus}
          onBlur={onWarehouseBlur}
          onOpenPopup={onOpenWarehousePopup}
          loading={warehouseLoading}
          invalid={warehouseInvalid}
          errorText={warehouseErrorText}
        />
        {warehouseFocused ? (
          <SuggestionList items={warehouseSuggestions} onSelect={onSelectWarehouse} floating />
        ) : null}
      </div>

      <div className="relative">
        <FieldBlock
          label={salesEmployeeLabel}
          placeholder={salesEmployeePlaceholder}
          loadingPlaceholder={salesEmployeeLoadingPlaceholder}
          value={salesEmployeeInput}
          onChange={onSalesEmployeeChange}
          onFocus={onSalesEmployeeFocus}
          onBlur={onSalesEmployeeBlur}
          onOpenPopup={onOpenSalesEmployeePopup}
          loading={salesEmployeesLoading}
          invalid={salesEmployeeInvalid}
          errorText={salesEmployeeErrorText}
        />
        {salesEmployeeFocused ? (
          <SuggestionList
            items={salesEmployeeSuggestions}
            onSelect={onSelectSalesEmployee}
            floating
          />
        ) : null}
      </div>
    </SectionCard>
  )
}
