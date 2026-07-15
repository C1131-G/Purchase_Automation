import { Router } from "express";

import { validateSession } from "@/core/middleware/auth.middleware";
import { loginLimiter } from "@/core/middleware/rate-limit.middleware";

import { itemMasterDal } from "./item-master.controller";

const router = Router();
router.use(validateSession);

router.get("/", itemMasterDal.getItems);
router.get("/itemcodes", loginLimiter, itemMasterDal.getItemCodes);
router.get("/itemnames", loginLimiter, itemMasterDal.getItemNames);
router.get("/groups", loginLimiter, itemMasterDal.getItemGroups);
router.get("/uoms", loginLimiter, itemMasterDal.getInvntryUoms);
router.get("/barcodes", loginLimiter, itemMasterDal.getBarCodes);
router.get("/:id", itemMasterDal.getItem);

export const itemMasterRoutes = router;
