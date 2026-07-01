// Attachments Service: File upload and metadata management.

import fs from "node:fs";
import path from "node:path";

import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { attachments } from "@/db/schema/attachments";
import { config } from "@/config/env";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";

const ensureUploadDir = () => {
  const dir = path.resolve(config.attachments.basePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

export const upload = async (file: Express.Multer.File, freeText?: string) => {
  const db = getDb();
  const uploadDir = ensureUploadDir();

  const fileName = `${Date.now()}-${file.originalname}`;
  const filePath = path.join(uploadDir, fileName);

  fs.writeFileSync(filePath, file.buffer);

  const ext = path.extname(file.originalname).replace(".", "");

  const [record] = await db
    .insert(attachments)
    .values({
      sourcePath: filePath,
      fileName: file.originalname,
      fileExtension: ext,
      freeText: freeText ?? null,
      attachmentDate: new Date().toISOString().split("T")[0],
    })
    .returning();

  logger.info({ id: record.id, fileName: file.originalname }, "Attachment uploaded");
  return record;
};

export const getById = async (id: number) => {
  const db = getDb();
  const [record] = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);
  if (!record) throw new AppError("Attachment not found", 404, "NOT_FOUND");
  return record;
};

export const downloadById = async (id: number) => {
  const record = await getById(id);
  if (!record.sourcePath || !fs.existsSync(record.sourcePath)) {
    throw new AppError("Attachment file not found on disk", 404, "FILE_NOT_FOUND");
  }
  return { stream: fs.createReadStream(record.sourcePath), record };
};

export const getList = async () => {
  const db = getDb();
  return db.select().from(attachments);
};

export const remove = async (id: number) => {
  const db = getDb();
  const record = await getById(id);

  try {
    if (fs.existsSync(record.sourcePath ?? "")) {
      fs.unlinkSync(record.sourcePath!);
    }
  } catch {
    logger.warn({ id, path: record.sourcePath }, "Failed to delete attachment file");
  }

  await db.delete(attachments).where(eq(attachments.id, id));
  logger.info({ id }, "Attachment deleted");
};

export const attachmentService = { downloadById, getById, getList, remove, upload };
