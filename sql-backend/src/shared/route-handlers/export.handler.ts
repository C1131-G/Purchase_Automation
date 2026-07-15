// Export handler factory: Creates per-document export handlers shared across all document modules.

import type { NextFunction, Request, RequestHandler, Response } from "express";

import { exportService } from "@/services/export/export.service";
import type { ExportFormat } from "@/services/export/export.types";
import { normalizeToExport } from "@/services/export/export.types";

type Fetcher = (docNum: number) => Promise<{
  doc: Record<string, unknown> | null;
  lines: Record<string, unknown>[];
  attachments: Record<string, unknown>[];
} | null>;

export const createExportHandler =
  (fetcher: Fetcher, entityLabel: string): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docNum = Number(req.params.docNum);
      const fmt = req.params.format as ExportFormat;

      if (!["excel", "pdf", "word"].includes(fmt)) {
        return res.status(400).json({ message: `Unsupported format: ${fmt}`, success: false });
      }

      const result = await fetcher(docNum);
      if (!result || !result.doc) {
        return res.status(404).json({ message: `${entityLabel} not found`, success: false });
      }

      const data = normalizeToExport(result.doc, result.lines, result.attachments);
      const buffer = await exportService.generateExport(fmt, data);

      res.setHeader("Content-Type", exportService.getMimeType(fmt));
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${entityLabel}_${docNum}.${exportService.getFileExtension(fmt)}"`,
      );
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };
