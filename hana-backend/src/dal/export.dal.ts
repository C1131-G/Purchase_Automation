// Export DAL: Factory that creates Express handlers for document export endpoints.

import type { NextFunction, Request, Response } from "express";
import { logger } from "@/core/logger/pino-logger";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import {
  generateExport,
  getMimeType,
  getFileExtension,
  normalizeToExport,
  type ExportFormat,
} from "@/services/export/export.service";

type DocFetcher = (
  sessionId: string,
  dbName: string,
  docNum: string,
) => Promise<Record<string, unknown>>;

export function createExportHandler(fetcher: DocFetcher, entityLabel: string) {
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

      const rawDoc = await fetcher(sessionId, dbName, docNum as string);
      const exportData = normalizeToExport(rawDoc, entityLabel);
      const buffer = await generateExport(exportData, exportFormat);

      const ext = getFileExtension(exportFormat);
      const mime = getMimeType(exportFormat);
      const filename = `${entityLabel.replace(/\s+/g, "_")}_${docNum}.${ext}`;

      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);
      res.end(buffer);
    } catch (error) {
      next(error);
    }
  };
}
