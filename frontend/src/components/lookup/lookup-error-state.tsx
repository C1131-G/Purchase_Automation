import { SectionErrorState } from '@/components/section-error-state'

type LookupErrorStateProps = {
  colSpan: number
  message?: string
  onRetry?: () => void
}

// LookupErrorState: Formats errors to fit perfectly inside table-aligned popups.
// Force-wraps standard error UI in a <tr><td> structure for grid alignment.
export function LookupErrorState({ colSpan, message, onRetry }: LookupErrorStateProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-4">
        <SectionErrorState
          variant="compact"
          title="Lookup unavailable"
          message={message}
          onRetry={onRetry}
        />
      </td>
    </tr>
  )
}
