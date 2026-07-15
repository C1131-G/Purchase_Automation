import nodeFs from "node:fs";
import path from "node:path";
import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { serviceLayerClient } from "@/services/service-layer.service";
import { getTenantRepository } from "@/db/tenant-query";
import { AttachmentLineSchema } from "@/db/schemas/attachment-line.schema";
import type { FileMetadata } from "./attachments.types";

export async function createSAPAttachment(
  sessionId: string,
  dbName: string,
  attachments: FileMetadata[],
): Promise<number> {
  // Pre-check: Verify that each file actually exists on the disk.
  for (const att of attachments) {
    const filePath = path.join(att.sourcePath, `${att.fileName}.${att.fileExtension}`);
    if (!nodeFs.existsSync(filePath)) {
      logger.error(
        {
          fileName: att.fileName,
          fileExtension: att.fileExtension,
          sourcePath: att.sourcePath,
          expectedFullPath: filePath,
        },
        "CRITICAL: Attachment file does not exist on disk! SAP Attachments2 service will reject this request.",
      );
    }
  }

  try {
    const payload = {
      Attachments2_Lines: attachments.map((att) => ({
        SourcePath: att.sourcePath,
        FileName: att.fileName,
        FileExtension: att.fileExtension,
        FreeText: att.freeText || "",
        Override: "tYES",
      })),
    };

    const response = await serviceLayerClient.request<{ AbsoluteEntry: number }>(
      sessionId,
      "POST",
      "/Attachments2",
      payload,
    );

    logger.info(
      { absoluteEntry: response.AbsoluteEntry },
      "Successfully registered attachments in SAP database via Service Layer",
    );

    return response.AbsoluteEntry;
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(
      { err: error, attachmentsCount: attachments?.length },
      "Failed to register attachment in SAP database via Service Layer",
    );
    throw new AppError(
      `Failed to link attachments in SAP: ${error.message}`,
      500,
      "SAP_DATABASE_ERROR",
    );
  }
}

/**
 * Retrieves lines from an existing SAP Attachments2 record.
 */

export async function getSAPAttachment(
  sessionId: string,
  attachmentEntry: number,
  dbName?: string,
): Promise<FileMetadata[]> {
  try {
    const tenantDb =
      dbName || (sessionId ? serviceLayerClient.getSession(sessionId)?.companyDB : "");
    if (tenantDb) {
      logger.info(
        { tenantDb, attachmentEntry },
        "Fetching attachments from ATC1 database via TypeORM",
      );
      const lineRepo = await getTenantRepository(tenantDb, AttachmentLineSchema);
      const lines = await lineRepo.find({
        where: { absEntry: attachmentEntry },
        order: { line: "ASC" },
      });

      if (lines && lines.length > 0) {
        return lines.map((line) => ({
          fileName: line.fileName,
          fileExtension: line.fileExt,
          sourcePath: line.trgtPath,
          attachmentDate: line.date ? new Date(line.date).toISOString() : "",
          freeText: line.freeText || "",
        }));
      }
    }
  } catch (dbErr: unknown) {
    logger.warn(
      { err: dbErr instanceof Error ? dbErr : new Error(String(dbErr)), attachmentEntry, dbName },
      "Failed to retrieve attachment from HANA database directly, falling back to Service Layer",
    );
  }

  try {
    logger.debug({ attachmentEntry }, "Falling back to Service Layer GET /Attachments2");
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
      { err: err, attachmentEntry },
      "Failed to retrieve attachment from SAP, returning empty list",
    );
    return [];
  }
}

/**
 * Saves attachments metadata locally for a document.
 */
