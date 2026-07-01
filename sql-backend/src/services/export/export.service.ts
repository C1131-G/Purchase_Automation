// Export orchestrator: Dispatches normalized export data to the correct format generator.

import type { ExportDocumentData, ExportFormat } from "./types";
import { generateExcel } from "./excel-generator.service";
import { generatePdf } from "./pdf-generator.service";
import { generateWord } from "./word-generator.service";

const mimeTypes: Record<ExportFormat, string> = {
  excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
  word: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const extensions: Record<ExportFormat, string> = {
  excel: "xlsx",
  pdf: "pdf",
  word: "docx",
};

export const getMimeType = (fmt: ExportFormat): string =>
  mimeTypes[fmt] ?? "application/octet-stream";
export const getFileExtension = (fmt: ExportFormat): string => extensions[fmt] ?? "bin";

export const generateExport = async (
  fmt: ExportFormat,
  data: ExportDocumentData,
): Promise<Buffer> => {
  switch (fmt) {
    case "excel":
      return generateExcel(data);
    case "pdf":
      return generatePdf(data);
    case "word":
      return generateWord(data);
  }
};

export const exportService = { generateExport, getFileExtension, getMimeType };
