export type { FileMetadata } from "./attachments.types";

import { formatDateTimeAMPM, sanitizeFilename } from "./attachments.format";
import { saveUploadedFiles, finalizeAttachments } from "./attachments.upload";
import { createSAPAttachment, getSAPAttachment } from "./attachments.sap";
import { saveLocalAttachments, getLocalAttachments } from "./attachments.local";
import {
  linkAttachmentsOnCreate,
  syncAttachmentsOnUpdate,
  finalizeAndLinkAttachments,
} from "./attachments.link";

export class AttachmentsService {
  formatDateTimeAMPM = formatDateTimeAMPM;
  sanitizeFilename = sanitizeFilename;
  saveUploadedFiles = saveUploadedFiles;
  finalizeAttachments = finalizeAttachments;
  createSAPAttachment = createSAPAttachment;
  getSAPAttachment = getSAPAttachment;
  saveLocalAttachments = saveLocalAttachments;
  getLocalAttachments = getLocalAttachments;
  linkAttachmentsOnCreate = linkAttachmentsOnCreate;
  syncAttachmentsOnUpdate = syncAttachmentsOnUpdate;
  finalizeAndLinkAttachments = finalizeAndLinkAttachments;
}

export const attachmentsService = new AttachmentsService();
