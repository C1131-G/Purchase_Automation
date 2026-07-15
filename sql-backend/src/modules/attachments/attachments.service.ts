import fs from "node:fs";
import path from "node:path";

import { config } from "@/config/env";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getDb } from "@/db/client";

import { attachmentsRepository } from "./attachments.repository";

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

  const record = await attachmentsRepository.insert(db, {
    attachmentDate: new Date().toISOString().split("T")[0],
    fileExtension: ext,
    fileName: file.originalname,
    freeText: freeText ?? null,
    sourcePath: filePath,
  });

  logger.info({ fileName: file.originalname, id: record.id }, "Attachment uploaded");
  return record;
};

export const getById = async (id: number) => {
  const db = getDb();
  const record = await attachmentsRepository.findById(db, id);
  if (!record) {
    throw new AppError("Attachment not found", 404, "NOT_FOUND");
  }
  return record;
};

export const downloadById = async (id: number) => {
  const record = await getById(id);
  if (!record.sourcePath || !fs.existsSync(record.sourcePath)) {
    throw new AppError("Attachment file not found on disk", 404, "FILE_NOT_FOUND");
  }
  return { record, stream: fs.createReadStream(record.sourcePath) };
};

export const getList = () => {
  const db = getDb();
  return attachmentsRepository.findList(db);
};

export const remove = async (id: number) => {
  const db = getDb();
  const record = await getById(id);

  try {
    if (fs.existsSync(record.sourcePath ?? "")) {
      fs.unlinkSync(record.sourcePath!);
    }
  } catch (err: unknown) {
    logger.warn(
      {
        err: err instanceof Error ? err : new Error(String(err)),
        id,
        path: record.sourcePath,
      },
      "Failed to delete attachment file",
    );
  }

  await attachmentsRepository.delete(db, id);
  logger.info({ id }, "Attachment deleted");
};

export const attachmentService = {
  downloadById,
  getById,
  getList,
  remove,
  upload,
};
