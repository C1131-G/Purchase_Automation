import { type ComponentProps } from 'react'

import { LookupPopup, type LookupPopupMode } from '@/components/lookup/lookup-popup'
import { AnimatedModalShell } from '@/features/create-pages/create-shared/components/core/animated-modal-shell'
import {
  type LookupOption,
  type PopupMode,
} from '@/features/create-pages/create-shared/utils/create-order.types'

type LookupPopupModalProps = {
  open: ComponentProps<typeof AnimatedModalShell>['open']
  mode: PopupMode
  search: string
  results: LookupOption[]
  loading: boolean
  error: string | null
  onRetry?: () => void
  onSearchChange: (value: string) => void
  onSearchSync?: (mode: PopupMode, value: string) => void
  onClose: ComponentProps<typeof AnimatedModalShell>['onClose']
  onSelect: (vendor: LookupOption) => void
}

export function LookupPopupModal({
  open,
  mode,
  search,
  results,
  loading,
  error,
  onRetry,
  onSearchChange,
  onSearchSync,
  onClose,
  onSelect,
}: LookupPopupModalProps) {
  const modeMap: Record<PopupMode, LookupPopupMode> = {
    'vendor-name': 'vendor-name',
    'vendor-code': 'vendor-code',
    warehouse: 'warehouse',
    'sales-employee': 'sales-employee',
  }

  return (
    <LookupPopup
      open={open}
      mode={modeMap[mode]}
      showBothColumns={mode === 'vendor-name' || mode === 'vendor-code'}
      search={search}
      results={results}
      loading={loading}
      error={error}
      {...(onRetry ? { onRetry } : {})}
      onSearchChange={(value) => {
        onSearchChange(value)
        onSearchSync?.(mode, value)
      }}
      onClose={onClose}
      onSelect={onSelect}
    />
  )
}
