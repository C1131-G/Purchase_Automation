// Export DAL: Factory that creates per-document export handlers.

import type { Request, RequestHandler, Response } from "express";
import type { ExportFormat } from "@/services/export/types";
import { normalizeToExport } from "@/services/export/types";
import { exportService } from "@/services/export/export.service";

type Fetcher = (docNum: number) => Promise<{
  doc: Record<string, any> | null;
  lines: Record<string, any>[];
  attachments: Record<string, any>[];
} | null>;

export const createExportHandler =
  (fetcher: Fetcher, entityLabel: string): RequestHandler =>
  async (req: Request, res: Response, next: any) => {
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
    } catch (e) {
      next(e);
    }
  };

export const exportDal = {};
