import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";

import { itemMasterController } from "./item-master.controller";

const router = Router();
router.use(validateSession);

router.get("/", itemMasterController.getItems);
router.get("/itemcodes", loginLimiter, itemMasterController.getItemCodes);
router.get("/itemnames", loginLimiter, itemMasterController.getItemNames);
router.get("/groups", loginLimiter, itemMasterController.getItemGroups);
router.get("/uoms", loginLimiter, itemMasterController.getInvntryUoms);
router.get("/barcodes", loginLimiter, itemMasterController.getBarCodes);
router.get("/:id", itemMasterController.getItem);

export const itemMasterRoutes = router;
