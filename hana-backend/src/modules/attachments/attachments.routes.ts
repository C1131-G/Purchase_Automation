import express from "express";
import { validateSession } from "@/core/middleware/auth.middleware";
import { attachmentsController } from "./attachments.controller";

const router = express.Router();

// Security: All attachment actions require an active session
router.use(validateSession);

// POST /upload: Upload files and save them locally
router.post("/upload", attachmentsController.uploadAttachments);

// GET /download: Stream file by name/path
router.get("/download", attachmentsController.downloadAttachment);

export const attachmentsRoutes = router;
