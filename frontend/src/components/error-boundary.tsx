import { Component } from "react";
import type { ReactNode } from "react";

import { SectionErrorState } from "@/components/section-error-state";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * GlobalErrorBoundary: The absolute safety net for the application's render cycle.
 * Prevents React "white-screen" crashes by catching errors in the component tree below.
 * DESIGN: Full-page layout capture with forced reset logic.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  public override state: State = {
    error: null,
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { error, hasError: true };
  }

  public override componentDidCatch() {
    // Send to monitoring service here if integrated.
  }

  private handleReset = () => {
    // Full reload ensures we clear any corrupted memory/state that lead to the crash.
    this.setState({ error: null, hasError: false });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] bg-surface">
          <SectionErrorState
            title="Application Error"
            message={
              this.state.error?.message ||
              "A critical error occurred while rendering the application."
            }
            onRetry={this.handleReset}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
