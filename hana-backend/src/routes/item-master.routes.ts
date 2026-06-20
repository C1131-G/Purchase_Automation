import express from "express";
import { validateSession } from "@/core/middleware/session.middleware";
import { itemMasterDal } from "@/dal/item-master.dal";
import { lookupLimiter } from "@/core/middleware/rate-limit.middleware";
import { validateQuery } from "@/validation/middleware/validation.middleware";
import {
  ItemMasterQuerySchema,
  ItemMasterLookupQuerySchema,
} from "@/validation/schemas/inputs/item-master.input";

const router = express.Router();

router.use(validateSession);

router.get("/", validateQuery(ItemMasterQuerySchema), itemMasterDal.getItems);
router.get(
  "/itemcodes",
  lookupLimiter,
  validateQuery(ItemMasterLookupQuerySchema),
  itemMasterDal.getItemCodes,
);
router.get(
  "/itemnames",
  lookupLimiter,
  validateQuery(ItemMasterLookupQuerySchema),
  itemMasterDal.getItemNames,
);
router.get(
  "/groups",
  lookupLimiter,
  validateQuery(ItemMasterLookupQuerySchema),
  itemMasterDal.getItemGroups,
);
router.get(
  "/uoms",
  lookupLimiter,
  validateQuery(ItemMasterLookupQuerySchema),
  itemMasterDal.getInvntryUoms,
);
router.get(
  "/barcodes",
  lookupLimiter,
  validateQuery(ItemMasterLookupQuerySchema),
  itemMasterDal.getBarCodes,
);
router.get("/:id", itemMasterDal.getItem);

export const itemMasterRoutes = router;
