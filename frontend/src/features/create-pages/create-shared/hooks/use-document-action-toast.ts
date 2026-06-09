import { useRef } from "react";
import { goeyToast } from "goey-toast";

export type ToastActionType = "save-new" | "view" | "close" | "draft" | "update";

/**
 * useDocumentActionToast: Generic hook to handle ERP document notifications (loading, success, error)
 * dynamically formatted based on the current action type.
 */
export function useDocumentActionToast() {
  const loadingToastIdRef = useRef<string | number | null>(null);

  const startLoading = (documentType: string, action: ToastActionType) => {
    let actionVerb = "Saving";
    if (action === "update") {
      actionVerb = "Updating";
    } else if (action === "draft") {
      actionVerb = "Drafting";
    }

    if (loadingToastIdRef.current) {
      goeyToast.dismiss(loadingToastIdRef.current);
    }

    loadingToastIdRef.current = goeyToast.info(`${actionVerb} ${documentType}…`, {
      duration: 24 * 60 * 60 * 1000, // Keep active until dismissed
    });
  };

  const showSuccess = (documentType: string, action: ToastActionType, docNum?: string | number) => {
    if (loadingToastIdRef.current) {
      goeyToast.dismiss(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }

    const docSuffix = docNum ? ` #${docNum}` : "";
    let successMessage = "";

    switch (action) {
      case "save-new":
        successMessage = `${documentType}${docSuffix} saved. Starting new document.`;
        break;
      case "view":
        successMessage = `${documentType}${docSuffix} saved. Form is open for review.`;
        break;
      case "close":
        successMessage = `${documentType}${docSuffix} saved and closed. Returning to dashboard.`;
        break;
      case "draft":
        successMessage = `${documentType} draft saved successfully.`;
        break;
      case "update":
        successMessage = `${documentType}${docSuffix} updated successfully.`;
        break;
      default:
        successMessage = `${documentType}${docSuffix} saved successfully.`;
    }

    goeyToast.success(successMessage, {
      duration: 5000,
    });
  };

  const showError = (documentType: string, action: ToastActionType, errorDetail?: string) => {
    if (loadingToastIdRef.current) {
      goeyToast.dismiss(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }

    let actionWord = "save";
    if (action === "update") {
      actionWord = "update";
    } else if (action === "draft") {
      actionWord = "draft";
    }

    const baseMessage = `Failed to ${actionWord} ${documentType}.`;
    goeyToast.error(errorDetail ? `${baseMessage} ${errorDetail}` : baseMessage);
  };

  return {
    startLoading,
    showSuccess,
    showError,
  };
}
