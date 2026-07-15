import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";

import { attachmentsController } from "./attachments.controller";

const router = Router();
router.use(validateSession);
router.post("/upload", ...attachmentsController.upload);
router.get("/", attachmentsController.getList);
router.get("/:id/download", attachmentsController.download);
router.delete("/:id", attachmentsController.remove);

export const attachmentRoutes = router;
