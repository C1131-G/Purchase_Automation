const express = require("express");
const router = new express.Router();
const controller = require("../controllers/custom-inventory-counting.js");
const { checkUserPermission } = require("../handler/session-handler.js");
const { portalModules, permissions } = require("../config/config.js");

//Base URL: /api/v1/custom/inventory-counting
router
  .route("/")
  // .get(checkUserPermission(portalModules.INVENTORY_COUNTING, permissions.READ), controller.get);
  .get(controller.get);

router
  .route("/items")
  // .get(checkUserPermission(portalModules.INVENTORY_COUNTING, permissions.READ), controller.getItems);
  .get(controller.getItems);

module.exports = router;
