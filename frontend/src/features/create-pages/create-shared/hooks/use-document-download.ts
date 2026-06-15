import { useCallback } from "react";
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
      if (!savedDocNum) return;
      const ext = extensions[type];
      const filename = `${entityLabel}_${savedDocNum}.${ext}`;
      downloadFile(`/api/v1/${apiRoute}/by-doc-num/${savedDocNum}/export/${type}`, filename);
    },
    [savedDocNum, apiRoute, entityLabel],
  );
}
