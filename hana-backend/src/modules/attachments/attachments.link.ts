import { logger } from "@/core/logger/pino-logger";
import { serviceLayerClient } from "@/services/service-layer.service";
import { getTenantRepository } from "@/db/tenant-query";
import { AttachmentLineSchema } from "@/db/schemas/attachment-line.schema";
import type { FileMetadata } from "./attachments.types";
import { finalizeAttachments } from "./attachments.upload";
import { saveLocalAttachments } from "./attachments.local";
import { createSAPAttachment, getSAPAttachment } from "./attachments.sap";

export async function linkAttachmentsOnCreate(
  sessionId: string,
  dbName: string,
  moduleName: string,
  docEntry: number | string,
  docNum: number | string,
  attachments: FileMetadata[],
  documentEndpoint: string,
): Promise<number | null> {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  try {
    // 1. Rename files from TEMP_... to DocNum_...
    const finalized = await finalizeAttachments(dbName, moduleName, docNum, attachments);

    // 2. Save local metadata (backward compatibility)
    await saveLocalAttachments(dbName, moduleName, docEntry, finalized);

    // 3. Create SAP Attachment entry
    const absoluteEntry = await createSAPAttachment(sessionId, dbName, finalized);

    // 4. Update the created SAP document with the AttachmentEntry
    await serviceLayerClient.request(
      sessionId,
      "PATCH",
      `/${documentEndpoint}(${docEntry})`,
      { AttachmentEntry: absoluteEntry },
      true,
    );

    logger.info(
      { docEntry, docNum, moduleName, absoluteEntry },
      "Successfully created and linked SAP attachment on document creation",
    );

    return absoluteEntry;
  } catch (err: unknown) {
    logger.error(
      {
        err: err instanceof Error ? err : new Error(String(err)),
        docEntry,
        docNum,
        moduleName,
      },
      "Failed to link attachments on document creation",
    );
    return null;
  }
}

/**
 * Helper to sync attachments on document update (edit).
 * Compares changes, and if updated, creates a new SAP Attachments2 record.
 * Returns the new AttachmentEntry, or null/existing if no change or cleared.
 */

export async function syncAttachmentsOnUpdate(
  sessionId: string,
  dbName: string,
  moduleName: string,
  docEntry: number | string,
  docNum: number | string,
  attachmentsPayload: FileMetadata[],
  existingAttachmentEntry: number | null,
): Promise<{ attachmentEntry: number | null; shouldUpdateDoc: boolean }> {
  try {
    // 1. Rename any new TEMP_... files to DocNum_...
    const finalized = await finalizeAttachments(
      dbName,
      moduleName,
      docNum,
      attachmentsPayload || [],
    );

    // 2. Save local metadata
    await saveLocalAttachments(dbName, moduleName, docEntry, finalized);

    // 3. If payload has no attachments
    if (finalized.length === 0) {
      if (existingAttachmentEntry) {
        return { attachmentEntry: null, shouldUpdateDoc: true };
      }
      return { attachmentEntry: null, shouldUpdateDoc: false };
    }

    // 4. Check if we need to update
    let shouldUpdate = true;
    if (existingAttachmentEntry) {
      const existingList = await getSAPAttachment(sessionId, existingAttachmentEntry, dbName);
      if (existingList.length === finalized.length) {
        const isIdentical = existingList.every((ext, idx) => {
          const fin = finalized[idx];
          return (
            fin &&
            ext.fileName === fin.fileName &&
            ext.fileExtension === fin.fileExtension &&
            ext.sourcePath === fin.sourcePath &&
            (ext.freeText || "") === (fin.freeText || "")
          );
        });
        if (isIdentical) {
          shouldUpdate = false;
        }
      }
    }

    if (shouldUpdate) {
      const newEntry = await createSAPAttachment(sessionId, dbName, finalized);
      logger.info(
        { docEntry, docNum, moduleName, newEntry, existingAttachmentEntry },
        "Created new SAP AttachmentEntry due to attachment changes",
      );
      return { attachmentEntry: newEntry, shouldUpdateDoc: true };
    }

    return { attachmentEntry: existingAttachmentEntry, shouldUpdateDoc: false };
  } catch (err: unknown) {
    logger.error(
      {
        err: err instanceof Error ? err : new Error(String(err)),
        docEntry,
        docNum,
        moduleName,
      },
      "Failed to sync attachments on document update",
    );
    // Return existing so we don't clear or break on failure
    return { attachmentEntry: existingAttachmentEntry, shouldUpdateDoc: false };
  }
}

/**
 * Finalizes file names on disk and updates direct database references in ATC1.
 * This is used during the optimized POST flow to avoid extra Service Layer PATCH calls.
 */

export async function finalizeAndLinkAttachments(
  dbName: string,
  moduleName: string,
  docEntry: number | string,
  docNum: number | string,
  absoluteEntry: number,
  attachments: FileMetadata[],
): Promise<FileMetadata[]> {
  const finalized = await finalizeAttachments(dbName, moduleName, docNum, attachments);

  // Save local metadata (backward compatibility)
  await saveLocalAttachments(dbName, moduleName, docEntry, finalized);

  try {
    logger.info(
      { dbName, absoluteEntry, docNum },
      "Updating attachment file names in SAP database via TypeORM",
    );
    const lineRepo = await getTenantRepository(dbName, AttachmentLineSchema);

    // Update FileName in ATC1 for each finalized attachment line
    let lineNum = 1;
    for (const att of finalized) {
      await lineRepo.update({ absEntry: absoluteEntry, line: lineNum }, { fileName: att.fileName });
      lineNum++;
    }

    logger.info(
      { absoluteEntry, docNum },
      "Successfully updated attachment file names in SAP database",
    );
  } catch (err: unknown) {
    logger.error(
      {
        err: err instanceof Error ? err : new Error(String(err)),
        absoluteEntry,
        docNum,
      },
      "Failed to update finalized attachment file names in SAP database",
    );
  }

  return finalized;
}
