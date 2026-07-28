import { Router } from "express";
import type { Request, Response } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { relationshipMapService } from "./relationship-map.service";

const router = Router();

router.use(validateSession);

router.get("/:docType/:docEntry", async (req: Request, res: Response) => {
  try {
    const dbName = (req as any).user?.dbName || (req.session as any)?.dbName;
    if (!dbName) {
      res.status(401).json({ success: false, message: "No database selected" });
      return;
    }

    const { docType, docEntry } = req.params;
    const entryId = Number(docEntry);

    const isIC = docType === "request-for-quotation";
    const isAR = [
      "sales-quotation",
      "sales-order",
      "ar-invoice",
      "ar-credit-memo",
      "incoming-payment",
    ].includes(docType as string);
    const isAP = [
      "purchase-quotation",
      "purchase-order",
      "grpo",
      "ap-invoice",
      "ap-credit-memo",
      "outgoing-payment",
    ].includes(docType as string);

    if (!docType || (!isIC && !isAR && !isAP)) {
      res.status(400).json({ success: false, message: "Invalid docType" });
      return;
    }
    if (!Number.isFinite(entryId) || entryId <= 0) {
      res.status(400).json({ success: false, message: "Invalid docEntry" });
      return;
    }

    const data = isIC
      ? await relationshipMapService.getIcRfqRelationshipMap(dbName, entryId)
      : isAP
        ? await relationshipMapService.getAPRelationshipMap(dbName, docType as any, entryId)
        : await relationshipMapService.getARRelationshipMap(dbName, docType as any, entryId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

export default router;
