import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";

import { attachmentDal } from "./attachments.controller";

const router = Router();
router.use(validateSession);
router.post("/upload", ...attachmentDal.upload);
router.get("/", attachmentDal.getList);
router.get("/:id/download", attachmentDal.download);
router.delete("/:id", attachmentDal.remove);

export const attachmentRoutes = router;
