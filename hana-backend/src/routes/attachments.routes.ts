import express from "express";
import { validateSession } from "@/core/middleware/session.middleware";
import { attachmentsDal } from "@/dal/attachments.dal";

const router = express.Router();

// Security: All attachment actions require an active session
router.use(validateSession);

// POST /upload: Upload files and save them locally
router.post("/upload", attachmentsDal.uploadAttachments);

// GET /download: Stream file by name/path
router.get("/download", attachmentsDal.downloadAttachment);

export const attachmentsRoutes = router;
