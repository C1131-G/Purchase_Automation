/** Document Action Toast: Unified success/error notifications for backend actions. */
import { goeyToast } from "goey-toast";

/**
 * Starts a "Creating…" info toast and returns a handle to resolve it.
 * Call `handle.success()` on mutation success, `handle.error()` on failure.
 *
 * @param documentType - Human-readable document name, e.g. "Purchase Order".
 * @param action - Mutation intent, either create or update.
 * @param docNum - Optional document number, shown in the success message.
 */
export function documentActionToast(
  documentType: string,
  action: "create" | "update" = "create",
  docNum?: string | number,
) {
  const verb = action === "update" ? "Updating" : "Creating";
  const successVerb = action === "update" ? "updated" : "created";
  const failureText = action === "update" ? "Update failed" : "Create failed";

  const loadingId = goeyToast.info(`${verb} ${documentType}…`, {
    // Keep visible until we explicitly dismiss on success/error.
    duration: 24 * 60 * 60 * 1000,
  });

  return {
    error: () => {
      goeyToast.dismiss(loadingId);
      goeyToast.error(failureText);
    },
    success: (docNumOverride?: string | number) => {
      goeyToast.dismiss(loadingId);
      const resolvedDocNum = docNumOverride ?? docNum;
      const docSuffix = resolvedDocNum ? ` ${resolvedDocNum}` : "";
      goeyToast.success(`${documentType}${docSuffix} ${successVerb}`, {
        duration: 5000, // 5 seconds
      });
    },
  };
}
