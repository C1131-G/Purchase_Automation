import { SectionErrorState } from "@/components/section-error-state";
import { toSafeErrorMessage } from "@/shared/utils/error-message";

interface LookupErrorStateProps {
  colSpan: number;
  message?: string;
  onRetry?: () => void;
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
          message={toSafeErrorMessage(message, "Unable to load lookup results. Please try again.")}
          onRetry={onRetry}
        />
      </td>
    </tr>
  );
}
