import { useCallback } from "react";

import {
  notifyActionError,
  notifyActionSuccess,
} from "@/features/create-pages/create-shared/utils/create-feedback-toast";

import { downloadFile } from "../utils/download-file";

const extensions: Record<string, string> = {
  pdf: "pdf",
  excel: "xlsx",
  word: "docx",
};

export function useDocumentDownload(
  savedDocNum: string | number | null | undefined,
  apiRoute: string,
  entityLabel: string,
) {
  return useCallback(
    (type: "pdf" | "excel" | "word") => {
      if (!savedDocNum) {
        notifyActionError(null, "Save the document before downloading.", `download-${entityLabel}`);
        return;
      }
      const ext = extensions[type];
      const filename = `${entityLabel}_${savedDocNum}.${ext}`;
      void downloadFile(`/api/v1/${apiRoute}/by-doc-num/${savedDocNum}/export/${type}`, filename)
        .then(() => {
          notifyActionSuccess(
            `${entityLabel} ${type.toUpperCase()} downloaded`,
            `download-${entityLabel}`,
          );
        })
        .catch((error: unknown) => {
          notifyActionError(
            error,
            `Failed to download ${entityLabel} ${type}.`,
            `download-${entityLabel}`,
          );
        });
    },
    [savedDocNum, apiRoute, entityLabel],
  );
}
