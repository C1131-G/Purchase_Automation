import fs from "node:fs";
import path from "node:path";
import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { config } from "@/config/env";
import { serviceLayerClient } from "@/services/service-layer.service";

export interface FileMetadata {
  fileName: string;
  fileExtension: string;
  sourcePath: string;
  attachmentDate: string;
  freeText?: string;
}

export class AttachmentsService {
  /**
   * Sanitizes a filename to prevent path traversal and ensure compatibility.
   */
  private sanitizeFilename(fileName: string): string {
    // Remove invalid characters, keeping alphanumeric, dots, hyphens, and underscores
    const ext = path.extname(fileName);
    const base = path.basename(fileName, ext);
    const sanitizedBase = base.replace(/[^a-zA-Z0-9.-]/g, "_");
    return sanitizedBase;
  }

  /**
   * Formats a date/time into DD_MM_YYYY_hh_mm_ss_AM/PM string format.
   */
  formatDateTimeAMPM(date: Date): string {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, "0");

    return `${day}_${month}_${year}_${strHours}_${minutes}_${seconds}_${ampm}`;
  }

  /**
   * Saves uploaded files to disk under the configured folder structure:
   * <base>\<DB_NAME>\<MODULE_NAME>\<YYYY-MM-DD>\
   */
  async saveUploadedFiles(
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
      logger.error({ error: err.message, folderPath }, "Failed to create directory");
      throw new AppError(
        `Failed to create directory for attachments: ${err.message}. Verify paths and permissions.`,
        500,
        "PERMISSIONS_ERROR",
      );
    }

    const savedFiles: FileMetadata[] = [];
    const dateStr = this.formatDateTimeAMPM(now);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const originalFilename = file.originalFilename || "uploaded_file";
      const fileExtension = path.extname(originalFilename).replace(".", "").toLowerCase();
      const sanitizedBase = this.sanitizeFilename(originalFilename);

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
        logger.error({ error: err.message, finalPath }, "Failed to write file to disk");
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
  async finalizeAttachments(
    dbName: string,
    moduleName: string,
    docNum: number | string,
    attachments: FileMetadata[],
  ): Promise<FileMetadata[]> {
    const finalizedList: FileMetadata[] = [];
    const now = new Date();
    const dateStr = this.formatDateTimeAMPM(now);

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
            logger.error(
              { error: err.message, oldFilePath, newFilePath },
              "Failed to rename temp file",
            );
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
  async createSAPAttachment(sessionId: string, attachments: FileMetadata[]): Promise<number> {
    try {
      const lines = attachments.map((att) => ({
        SourcePath: att.sourcePath,
        FileName: att.fileName,
        FileExtension: att.fileExtension,
        FreeText: att.freeText || "",
      }));

      const response = await serviceLayerClient.request<{ AbsoluteEntry: number }>(
        sessionId,
        "POST",
        "/Attachments2",
        { Attachments2_Lines: lines },
      );

      if (!response || typeof response.AbsoluteEntry !== "number") {
        throw new Error("Invalid response received from SAP Attachments2 service");
      }

      return response.AbsoluteEntry;
    } catch (err: any) {
      logger.error({ error: err.message, attachments }, "Failed to register attachment in SAP");
      throw new AppError(
        `Failed to link attachments in SAP: ${err.message}`,
        err.statusCode || 500,
        "SAP_API_ERROR",
      );
    }
  }

  /**
   * Retrieves lines from an existing SAP Attachments2 record.
   */
  async getSAPAttachment(sessionId: string, attachmentEntry: number): Promise<FileMetadata[]> {
    try {
      const response = await serviceLayerClient.request<{
        AbsoluteEntry: number;
        Attachments2_Lines: any[];
      }>(sessionId, "GET", `/Attachments2(${attachmentEntry})`);

      if (!response || !Array.isArray(response.Attachments2_Lines)) {
        return [];
      }

      return response.Attachments2_Lines.map((line) => ({
        fileName: line.FileName,
        fileExtension: line.FileExtension,
        sourcePath: line.SourcePath,
        attachmentDate: line.AttachmentDate || "",
        freeText: line.FreeText || "",
      }));
    } catch (err: any) {
      // If attachment record is missing/not found, log it and return empty instead of breaking the document fetch
      logger.warn(
        { error: err.message, attachmentEntry },
        "Failed to retrieve attachment from SAP, returning empty list",
      );
      return [];
    }
  }

  /**
   * Saves attachments metadata locally for a document.
   */
  async saveLocalAttachments(
    dbName: string,
    moduleName: string,
    docEntry: number | string,
    attachments: FileMetadata[],
  ): Promise<void> {
    const basePath = config.attachments.basePath;
    const folderPath = path.join(basePath, dbName, moduleName);

    try {
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const filePath = path.join(folderPath, `${docEntry}_attachments.json`);
      fs.writeFileSync(filePath, JSON.stringify(attachments, null, 2), "utf8");
      logger.info(
        { docEntry, moduleName, dbName },
        "Successfully saved local attachments metadata",
      );
    } catch (err: any) {
      logger.error(
        { error: err.message, docEntry, moduleName },
        "Failed to save local attachments metadata",
      );
    }
  }

  /**
   * Retrieves attachments metadata locally for a document.
   */
  async getLocalAttachments(
    dbName: string,
    moduleName: string,
    docEntry: number | string,
  ): Promise<FileMetadata[]> {
    const basePath = config.attachments.basePath;
    const filePath = path.join(basePath, dbName, moduleName, `${docEntry}_attachments.json`);

    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => ({
            fileName: item.fileName,
            fileExtension: item.fileExtension || "",
            sourcePath: item.sourcePath || "",
            attachmentDate: item.attachmentDate || "",
            freeText: item.freeText || item.remarks || "",
          }));
        }
      }
    } catch (err: any) {
      logger.error(
        { error: err.message, docEntry, moduleName },
        "Failed to read local attachments metadata",
      );
    }
    return [];
  }
}

export const attachmentsService = new AttachmentsService();
