import type { RequestHandler } from "express";
import multer from "multer";

import { attachmentService } from "./attachments.service";

const uploadMiddleware = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
  storage: multer.memoryStorage(),
});

export const upload: RequestHandler[] = [
  uploadMiddleware.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided", success: false });
      }
      const result = await attachmentService.upload(
        req.file,
        req.body.freeText as string | undefined,
      );
      res.status(201).json({ data: result, message: "File uploaded", success: true });
    } catch (error) {
      return next(error);
    }
  },
];

export const getList: RequestHandler = async (_req, res, next) => {
  try {
    const result = await attachmentService.getList();
    res.status(200).json({ data: result, success: true });
  } catch (error) {
    return next(error);
  }
};

export const download: RequestHandler = async (req, res, next) => {
  try {
    const { stream, record } = await attachmentService.downloadById(Number(req.params.id));
    const filename = `${record.fileName}.${record.fileExtension}`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    stream.pipe(res);
  } catch (error) {
    return next(error);
  }
};

export const remove: RequestHandler = async (req, res, next) => {
  try {
    await attachmentService.remove(Number(req.params.id));
    res.status(200).json({ message: "Attachment deleted", success: true });
  } catch (error) {
    return next(error);
  }
};

export const attachmentsController = { download, getList, remove, upload };
