import { useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "@tanstack/react-router";
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

  const handleReset = useCallback(() => {
    resetForm();
    setIsSaved(false);
    setSavedDocNum(null);
    lastSavedStateRef.current = "";
    window.scrollTo({ behavior: "smooth", top: 0 });
    void router.navigate({
      replace: true,
      search: {},
      to: defaultUrl,
    });
  }, [resetForm, defaultUrl, router]);

  const handleActionSuccess = useCallback(
    async (
      action: "save-new" | "view" | "close" | "draft" | "update",
      createdDocNum?: string | number,
    ) => {
      actionToast.showSuccess(documentName, action === "update" ? "update" : action, createdDocNum);

      if (isEditMode) {
        window.scrollTo({ behavior: "smooth", top: 0 });
        return;
      }

      if (action === "draft") {
        window.scrollTo({ behavior: "smooth", top: 0 });
        return;
      }

      if (action === "save-new") {
        resetForm();
        setIsSaved(false);
        setSavedDocNum(null);
        lastSavedStateRef.current = "";
        window.scrollTo({ behavior: "smooth", top: 0 });
      } else if (action === "close") {
        resetForm();
        setIsSaved(false);
        setSavedDocNum(null);
        lastSavedStateRef.current = "";
        const dashboardUrl = moduleType === "purchase" ? "/dashboard/purchase" : "/dashboard/sales";
        void router.navigate({ to: dashboardUrl });
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
  };
}
