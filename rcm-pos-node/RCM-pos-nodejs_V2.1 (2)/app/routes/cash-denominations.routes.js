const express = require("express");
const cashDenomination = require("../controllers/cash-denominations.controller.js");
const { portalModules, permissions } = require("../config/config");
const { checkUserPermission } = require("../handler/session-handler");

const router = new express.Router();

//Base URL: /api/v1/custom/cash-denomination

// Create a new CD
router.post(
  "/",
  checkUserPermission(portalModules.INVOICE, permissions.CREATE),
  cashDenomination.create,
);

// Retrieve all CD
router.get(
  "/",
  checkUserPermission(portalModules.INVOICE, permissions.READ),
  cashDenomination.findAll,
);

// Delete a CD with id
router.delete(
  "/:id",
  checkUserPermission(portalModules.INVOICE, permissions.CANCEL),
  cashDenomination.delete,
);

module.exports = router;
