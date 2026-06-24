import type { NextFunction, Request, Response } from "express";
import formidable from "formidable";
import fs from "node:fs";
import path from "node:path";
import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { attachmentsService } from "@/services/attachments.service";
import type { AuthenticatedRequest } from "@/dal/types/express.types";
import { config } from "@/config/env";

/**
 * Recursively searches a directory for a specific filename.
 */
function findFileRecursive(dir: string, targetName: string): string | null {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const found = findFileRecursive(fullPath, targetName);
        if (found) return found;
      } else if (file.toLowerCase() === targetName.toLowerCase()) {
        return fullPath;
      }
    }
  } catch (err: any) {
    logger.warn({ error: err.message, dir }, "Failed to read directory during recursive search");
  }
  return null;
}

/**
 * Handle multipart upload of attachment files.
 */
export const uploadAttachments = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest;
  const form = formidable({
    keepExtensions: true,
    maxFileSize: 25 * 1024 * 1024, // 25MB
  });

  try {
    const { fields, files } = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    const dbName = authReq.user.dbName;
    const rawModuleName = fields.moduleName || req.query.moduleName;
    const moduleName = Array.isArray(rawModuleName) ? rawModuleName[0] : rawModuleName;

    if (!moduleName) {
      throw new AppError("moduleName is required", 400, "VALIDATION_ERROR");
    }

    const rawFiles = files.files;
    const fileList = Array.isArray(rawFiles) ? rawFiles : rawFiles ? [rawFiles] : [];

    if (fileList.length === 0) {
      throw new AppError("No files uploaded", 400, "VALIDATION_ERROR");
    }

    logger.info({ dbName, moduleName, filesCount: fileList.length }, "Saving uploaded files");

    const savedFiles = await attachmentsService.saveUploadedFiles(fileList, dbName, moduleName);

    res.status(200).json({
      success: true,
      files: savedFiles,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Stream/Download an attachment file.
 */
export const downloadAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fileName = String(req.query.fileName || "").trim();
    const fileExtension = String(req.query.fileExtension || "").trim();
    const sourcePath = String(req.query.sourcePath || "").trim();

    if (!fileName || !fileExtension) {
      throw new AppError("fileName and fileExtension are required", 400, "VALIDATION_ERROR");
    }

    const targetFile = `${fileName}.${fileExtension}`;
    let filePath = "";

    // 1. Try absolute resolve from sourcePath
    if (sourcePath) {
      const directPath = path.join(sourcePath, targetFile);
      if (fs.existsSync(directPath)) {
        filePath = directPath;
      }
    }

    // 2. Fallback: Search recursively under attachments base directory
    if (!filePath) {
      logger.info({ targetFile }, "File not found at sourcePath, initiating recursive search");
      const resolvedPath = findFileRecursive(config.attachments.basePath, targetFile);
      if (resolvedPath) {
        filePath = resolvedPath;
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      logger.warn({ targetFile, sourcePath }, "Requested file not found on disk");
      throw new AppError("Attachment file not found on disk", 404, "NOT_FOUND");
    }

    logger.info({ filePath }, "Streaming attachment to client");

    // Set headers to trigger file download in browser
    res.setHeader("Content-Disposition", `attachment; filename="${targetFile}"`);
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

export const attachmentsDal = {
  downloadAttachment,
  uploadAttachments,
};
