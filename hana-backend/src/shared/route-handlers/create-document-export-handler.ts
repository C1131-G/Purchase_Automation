// Factory for Express handlers that export a document as PDF, Excel, or Word.

import type { NextFunction, Request, Response } from "express";

import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/types/express.types";
import {
  generateExport,
  getMimeType,
  getFileExtension,
  normalizeToExport,
  type ExportFormat,
} from "@/services/export/export.service";

type DocumentExportFetcher = (
  sessionId: string,
  dbName: string,
  docNum: string,
) => Promise<Record<string, unknown>>;

export function createExportHandler(fetcher: DocumentExportFetcher, entityLabel: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as unknown as AuthenticatedRequest;
    try {
      const { sessionId } = authReq.session;
      const { dbName } = authReq.user;
      const { docNum, format } = authReq.params;

      if (!["pdf", "excel", "word"].includes(format as string)) {
        res.status(400).json({
          success: false,
          message: `Unsupported export format: ${format}`,
        });
        return;
      }

      const exportFormat = format as ExportFormat;
      logger.info({
        docNum,
        format: exportFormat,
        entity: entityLabel,
        msg: "Exporting document",
      });

      const rawDocument = await fetcher(sessionId, dbName, docNum as string);
      const exportData = normalizeToExport(rawDocument, entityLabel);
      const buffer = await generateExport(exportData, exportFormat);

      const extension = getFileExtension(exportFormat);
      const mimeType = getMimeType(exportFormat);
      const filename = `${entityLabel.replace(/\s+/g, "_")}_${docNum}.${extension}`;

      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);
      res.end(buffer);
    } catch (error) {
      next(error);
    }
  };
}
