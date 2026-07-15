import nodeFs from "node:fs";
import path from "node:path";
import { logger } from "@/core/logger/pino-logger";
import { config } from "@/config/env";
import type { FileMetadata } from "./attachments.types";

export async function saveLocalAttachments(
  dbName: string,
  moduleName: string,
  docEntry: number | string,
  attachments: FileMetadata[],
): Promise<void> {
  const basePath = config.attachments.basePath;
  const folderPath = path.join(basePath, dbName, moduleName);

  try {
    if (!nodeFs.existsSync(folderPath)) {
      nodeFs.mkdirSync(folderPath, { recursive: true });
    }

    const filePath = path.join(folderPath, `${docEntry}_attachments.json`);
    nodeFs.writeFileSync(filePath, JSON.stringify(attachments, null, 2), "utf8");
    logger.info({ docEntry, moduleName, dbName }, "Successfully saved local attachments metadata");
  } catch (err: any) {
    logger.error({ err: err, docEntry, moduleName }, "Failed to save local attachments metadata");
  }
}

/**
 * Retrieves attachments metadata locally for a document.
 */

export async function getLocalAttachments(
  dbName: string,
  moduleName: string,
  docEntry: number | string,
): Promise<FileMetadata[]> {
  const basePath = config.attachments.basePath;
  const filePath = path.join(basePath, dbName, moduleName, `${docEntry}_attachments.json`);

  try {
    if (nodeFs.existsSync(filePath)) {
      const raw = nodeFs.readFileSync(filePath, "utf8");
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
    logger.error({ err: err, docEntry, moduleName }, "Failed to read local attachments metadata");
  }
  return [];
}

/**
 * Helper to sync attachments on document creation.
 * Finalizes file names, registers them in SAP Attachments2, and links the entry to the document.
 */
