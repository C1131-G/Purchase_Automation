import { useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "@tanstack/react-router";

import { scrollToTop } from "@/shared/utils/scroll";

import { useDocumentActionToast } from "./use-document-action-toast";

interface UseDocumentSaveActionsOptions {
  documentName: string;
  moduleType: "purchase" | "sales";
  defaultUrl: string;
  resetForm: () => void;
  getPayloadString: () => string;
  isEditMode: boolean;
}

export function useDocumentSaveActions({
  documentName,
  moduleType,
  defaultUrl,
  resetForm,
  getPayloadString,
  isEditMode,
}: UseDocumentSaveActionsOptions) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const [savedDocNum, setSavedDocNum] = useState<string | number | null>(null);
  const lastSavedStateRef = useRef<string>("");
  const actionToast = useDocumentActionToast();

  // ── Lightweight performance timing markers ────────────────────────────────
  // Fire-and-forget console.info calls so devtools can confirm speedup.
  // Nothing here blocks the UI or modifies query / form state.
  const saveStartRef = useRef<number>(0);
  const mutationEndRef = useRef<number>(0);

  const startSaveTracking = useCallback(
    (action: string) => {
      saveStartRef.current = performance.now();
      mutationEndRef.current = 0;
      // eslint-disable-next-line no-console
      console.info(`[Timing] ${documentName} save started — action="${action}"`);
    },
    [documentName],
  );

  const trackMutationSuccess = useCallback(() => {
    mutationEndRef.current = performance.now();
    const elapsed = (mutationEndRef.current - saveStartRef.current).toFixed(1);
    // eslint-disable-next-line no-console
    console.info(
      `[Timing] ${documentName} SAP mutation confirmed in ${elapsed} ms — button now idle`,
    );
  }, [documentName]);

  const trackPostSaveRefresh = useCallback(() => {
    if (mutationEndRef.current === 0) return;
    const elapsed = (performance.now() - mutationEndRef.current).toFixed(1);
    // eslint-disable-next-line no-console
    console.info(
      `[Timing] ${documentName} background refresh completed ${elapsed} ms after mutation`,
    );
  }, [documentName]);
  // ──────────────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    resetForm();
    setIsSaved(false);
    setSavedDocNum(null);
    lastSavedStateRef.current = "";
    scrollToTop();
    void router.navigate({
      replace: true,
      search: {},
      to: defaultUrl,
      viewTransition: true,
    });
  }, [resetForm, defaultUrl, router]);

  const handleActionSuccess = useCallback(
    async (
      action: "save-new" | "view" | "close" | "draft" | "update",
      createdDocNum?: string | number,
    ) => {
      actionToast.showSuccess(documentName, action === "update" ? "update" : action, createdDocNum);

      if (isEditMode) {
        scrollToTop();
        return;
      }

      if (action === "draft") {
        scrollToTop();
        return;
      }

      if (action === "save-new") {
        resetForm();
        setIsSaved(false);
        setSavedDocNum(null);
        lastSavedStateRef.current = "";
        scrollToTop();
        void router.navigate({
          replace: true,
          search: {},
          to: defaultUrl,
          viewTransition: true,
        });
      } else if (action === "close") {
        resetForm();
        setIsSaved(false);
        setSavedDocNum(null);
        lastSavedStateRef.current = "";
        scrollToTop();
        const dashboardUrl =
          moduleType === "purchase"
            ? ("/dashboard/purchase" as const)
            : ("/dashboard/sales" as const);
        void router.navigate({
          to: dashboardUrl,
          search: { period: "week" },
          viewTransition: true,
        });
      } else if (action === "view") {
        setIsSaved(true);
        setSavedDocNum(createdDocNum ?? null);
        lastSavedStateRef.current = getPayloadString();
      }
    },
    [documentName, isEditMode, resetForm, moduleType, router, actionToast, getPayloadString],
  );

  const isFormModifiedSinceSave = useMemo(() => {
    if (!isSaved) {
      return false;
    }
    return getPayloadString() !== lastSavedStateRef.current;
  }, [isSaved, getPayloadString]);

  return {
    isSaved: isSaved && !isFormModifiedSinceSave,
    savedDocNum,
    setIsSaved,
    setSavedDocNum,
    handleReset,
    handleActionSuccess,
    actionToast,
    startSaveTracking,
    trackMutationSuccess,
    trackPostSaveRefresh,
  };
}
