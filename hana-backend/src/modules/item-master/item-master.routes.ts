import express from "express";
import { validateSession } from "@/core/middleware/auth.middleware";
import { itemMasterController } from "./item-master.controller";
import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateQuery } from "@/core/middleware/validation.middleware";
import { ItemMasterQuerySchema, ItemMasterLookupQuerySchema } from "./item-master.schema";

const router = express.Router();

router.use(validateSession);

router.get("/", validateQuery(ItemMasterQuerySchema), itemMasterController.getItems);
router.get(
  "/itemcodes",
  lookupLimiter,
  validateQuery(ItemMasterLookupQuerySchema),
  itemMasterController.getItemCodes,
);
router.get(
  "/itemnames",
  lookupLimiter,
  validateQuery(ItemMasterLookupQuerySchema),
  itemMasterController.getItemNames,
);
router.get(
  "/groups",
  lookupLimiter,
  validateQuery(ItemMasterLookupQuerySchema),
  itemMasterController.getItemGroups,
);
router.get(
  "/uoms",
  lookupLimiter,
  validateQuery(ItemMasterLookupQuerySchema),
  itemMasterController.getInvntryUoms,
);
router.get(
  "/barcodes",
  lookupLimiter,
  validateQuery(ItemMasterLookupQuerySchema),
  itemMasterController.getBarCodes,
);
router.get("/:id", itemMasterController.getItem);

export const itemMasterRoutes = router;
