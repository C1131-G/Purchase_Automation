/** Lookup Search Sync: Synchronizes toolbar search states with specialized lookup popups. */
import { type PopupMode } from '@/features/create-pages/create-shared/utils/create-order.types'

type LookupSearchSyncHandlers = {
  onVendorName: (value: string) => void
  onVendorCode: (value: string) => void
  onWarehouse: (value: string) => void
  onSalesEmployee: (value: string) => void
}

export const syncLookupSearchByMode = (
  mode: PopupMode,
  value: string,
  handlers: LookupSearchSyncHandlers,
) => {
  if (mode === 'vendor-name') {
    handlers.onVendorName(value)
    return
  }
  if (mode === 'vendor-code') {
    handlers.onVendorCode(value)
    return
  }
  if (mode === 'warehouse') {
    handlers.onWarehouse(value)
    return
  }
  handlers.onSalesEmployee(value)
}
