// Factory for per-document export route handlers shared across document modules.

import type { NextFunction, Request, RequestHandler, Response } from "express";

import { exportService } from "@/services/export/export.service";
import type { ExportFormat } from "@/services/export/export.types";
import { normalizeToExport } from "@/services/export/export.types";

type DocumentExportFetcher = (docNum: number) => Promise<{
  doc: Record<string, unknown> | null;
  lines: Record<string, unknown>[];
  attachments: Record<string, unknown>[];
} | null>;

export const createExportHandler =
  (fetcher: DocumentExportFetcher, entityLabel: string): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docNum = Number(req.params.docNum);
      const format = req.params.format as ExportFormat;

      if (!["excel", "pdf", "word"].includes(format)) {
        return res.status(400).json({ message: `Unsupported format: ${format}`, success: false });
      }

      const fetchResult = await fetcher(docNum);
      if (!fetchResult || !fetchResult.doc) {
        return res.status(404).json({ message: `${entityLabel} not found`, success: false });
      }

      const exportPayload = normalizeToExport(
        fetchResult.doc,
        fetchResult.lines,
        fetchResult.attachments,
      );
      const buffer = await exportService.generateExport(format, exportPayload);

      res.setHeader("Content-Type", exportService.getMimeType(format));
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${entityLabel}_${docNum}.${exportService.getFileExtension(format)}"`,
      );
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };
