import fs from "node:fs";
import path from "node:path";
import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { config } from "@/config/env";
import type { FileMetadata } from "./attachments.types";
import { formatDateTimeAMPM, sanitizeFilename } from "./attachments.format";

export async function saveUploadedFiles(
  files: any[],
  dbName: string,
  moduleName: string,
): Promise<FileMetadata[]> {
  const basePath = config.attachments.basePath;
  const now = new Date();

  // YYYY-MM-DD
  const dateDir = now.toISOString().slice(0, 10);
  const folderPath = path.join(basePath, dbName, moduleName, dateDir);

  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
  } catch (err: any) {
    logger.error({ err: err, folderPath }, "Failed to create directory");
    throw new AppError(
      `Failed to create directory for attachments: ${err.message}. Verify paths and permissions.`,
      500,
      "PERMISSIONS_ERROR",
    );
  }

  const savedFiles: FileMetadata[] = [];
  const dateStr = formatDateTimeAMPM(now);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const originalFilename = file.originalFilename || "uploaded_file";
    const fileExtension = path.extname(originalFilename).replace(".", "").toLowerCase();
    const sanitizedBase = sanitizeFilename(originalFilename);

    // File name shape: TEMP_<DD_MM_YYYY_HOUR_MIN_SEC_AM/PM>_<i>_<sanitizedOriginalName>
    const idealBaseName = `TEMP_${dateStr}_${i}_${sanitizedBase}`;
    let finalBaseName = idealBaseName;
    let counter = 1;

    // Check collision and append suffix if needed
    while (fs.existsSync(path.join(folderPath, `${finalBaseName}.${fileExtension}`))) {
      finalBaseName = `${idealBaseName}_${counter}`;
      counter++;
    }

    const finalPath = path.join(folderPath, `${finalBaseName}.${fileExtension}`);

    try {
      fs.copyFileSync(file.filepath, finalPath);
      // Clean up temp file
      try {
        fs.unlinkSync(file.filepath);
      } catch {
        // Ignore temp cleanup errors
      }
    } catch (err: any) {
      logger.error({ err: err, finalPath }, "Failed to write file to disk");
      throw new AppError(
        `Failed to save file ${originalFilename} to disk: ${err.message}. Verify permissions.`,
        500,
        "PERMISSIONS_ERROR",
      );
    }

    savedFiles.push({
      fileName: finalBaseName,
      fileExtension,
      sourcePath: folderPath,
      attachmentDate: dateDir,
      freeText: "",
    });
  }

  return savedFiles;
}

/**
 * Renames temp files to include the document number for easy finding.
 */

export async function finalizeAttachments(
  dbName: string,
  moduleName: string,
  docNum: number | string,
  attachments: FileMetadata[],
): Promise<FileMetadata[]> {
  const finalizedList: FileMetadata[] = [];
  const now = new Date();
  const dateStr = formatDateTimeAMPM(now);

  for (let i = 0; i < attachments.length; i++) {
    const att = attachments[i];
    if (att.fileName.startsWith("TEMP_")) {
      // Extract original name portion
      const parts = att.fileName.split("_");
      let originalPart = att.fileName;
      if (parts.length >= 8) {
        originalPart = parts.slice(8).join("_");
      }

      const newBaseName = `DocNum_${docNum}_${dateStr}_${i}_${originalPart}`;
      let finalNewName = newBaseName;
      let counter = 1;

      const oldFilePath = path.join(att.sourcePath, `${att.fileName}.${att.fileExtension}`);

      if (fs.existsSync(oldFilePath)) {
        while (fs.existsSync(path.join(att.sourcePath, `${finalNewName}.${att.fileExtension}`))) {
          finalNewName = `${newBaseName}_${counter}`;
          counter++;
        }

        const newFilePath = path.join(att.sourcePath, `${finalNewName}.${att.fileExtension}`);
        try {
          fs.renameSync(oldFilePath, newFilePath);
          logger.info({ oldFilePath, newFilePath }, "Renamed temp attachment file");

          finalizedList.push({
            ...att,
            fileName: finalNewName,
          });
          continue;
        } catch (err: any) {
          logger.error({ err: err, oldFilePath, newFilePath }, "Failed to rename temp file");
        }
      }
    }

    finalizedList.push(att);
  }

  return finalizedList;
}

/**
 * Creates an Attachments2 record in the SAP Service Layer.
 */
