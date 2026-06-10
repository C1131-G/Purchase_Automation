import express from "express";
import multer from "multer";

import { uploadAttachment } from "@/controllers/attachment.controller";
import { validateSession as isAuthenticated } from "@/core/middleware/session.middleware";

const router = express.Router();

// Multer setup to handle file upload in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /api/v1/attachments
router.post("/", isAuthenticated, upload.single("file"), uploadAttachment);

export default router;
