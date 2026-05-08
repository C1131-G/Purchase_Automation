import { SectionErrorState } from "@/components/section-error-state";
import { toSafeErrorMessage } from "@/shared/utils/error-message";

interface TableErrorStateProps {
  title?: string | undefined;
  message?: string | undefined;
  onRetry?: () => void;
  className?: string;
}

// TableErrorState: Standardized wrapper for table loading failures.
// Centrally decouples feature-tables from specific error-UI implementations.
export function TableErrorState(props: TableErrorStateProps) {
  return (
    <SectionErrorState
      {...props}
      message={toSafeErrorMessage(
        props.message,
        "Unable to load data right now. Please try again shortly.",
      )}
    />
  );
}
