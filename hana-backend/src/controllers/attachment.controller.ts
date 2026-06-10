import type { NextFunction, Request, Response } from "express";

import type { AuthenticatedRequest } from "@/dal/types/express.types";
import { uploadAttachmentToSAP } from "@/services/attachment.service";

export const uploadAttachment = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as unknown as AuthenticatedRequest<
    Record<string, never>,
    unknown,
    unknown,
    Record<string, never>
  >;

  try {
    const file = req.file;
    console.log("[uploadAttachment] req.file:", file ? file.originalname : "undefined");
    console.log("[uploadAttachment] req.body:", req.body);
    console.log("[uploadAttachment] req.headers.content-type:", req.headers["content-type"]);
    
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const { sessionId } = authReq.session;
    const attachmentEntry = await uploadAttachmentToSAP(sessionId, file.buffer, file.originalname);

    res.status(200).json({
      message: "Attachment uploaded successfully",
      attachmentEntry,
    });
  } catch (error) {
    console.error("[uploadAttachment] error:", error);
    require("fs").appendFileSync("error.log", "[uploadAttachment] " + String(error) + "\n");
    next(error);
  }
};
