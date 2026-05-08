/** Page Loading Toast: Unified loading notification for create/edit page hydration. */
import { goeyToast } from "goey-toast";

/**
 * Starts a "Loading..." info toast and returns a handle to dismiss it.
 * Call `handle.dismiss()` when page hydration is complete.
 *
 * @param documentType - Human-readable document name, e.g. "Purchase Order".
 * @param mode - Either 'create' (with copy-from/copy-to) or 'edit' (rehydration).
 */
export function pageLoadingToast(documentType: string, mode: "create" | "edit" = "create") {
  const message = mode === "edit" ? `Loading ${documentType}…` : `Preparing ${documentType}…`;

  const loadingId = goeyToast.info(message, {
    // Keep visible until we explicitly dismiss
    duration: 24 * 60 * 60 * 1000,
  });

  return {
    dismiss: () => {
      goeyToast.dismiss(loadingId);
    },
  };
}
