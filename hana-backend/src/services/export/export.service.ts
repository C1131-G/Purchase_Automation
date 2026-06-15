// Export orchestrator: dispatches to the correct generator based on format.

import type { ExportDocumentData, ExportFormat } from "./types";
import { generatePdf } from "./pdf-generator.service";
import { generateExcel } from "./excel-generator.service";
import { generateWord } from "./word-generator.service";

export type { ExportDocumentData, ExportFormat } from "./types";
export { normalizeToExport } from "./types";

export async function generateExport(
  data: ExportDocumentData,
  format: ExportFormat,
): Promise<Buffer> {
  switch (format) {
    case "pdf":
      return generatePdf(data);
    case "excel":
      return generateExcel(data);
    case "word":
      return generateWord(data);
  }
}

export function getMimeType(format: ExportFormat): string {
  switch (format) {
    case "pdf":
      return "application/pdf";
    case "excel":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "word":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
}

export function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case "pdf":
      return "pdf";
    case "excel":
      return "xlsx";
    case "word":
      return "docx";
  }
}
