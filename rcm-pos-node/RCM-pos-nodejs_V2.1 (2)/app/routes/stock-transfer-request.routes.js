const express = require("express");
const router = new express.Router();
const controller = require("../controllers/custom-stock-transfer-request-new.js");
const { checkUserPermission } = require("../handler/session-handler.js");
const { portalModules, permissions } = require("../config/config.js");

//Base URL: /api/v1/custom/stock-transfer-request-new
// TODO: need to remove the `-new` suffix & comment the OLD
router
  .route("/")
  .get(
    checkUserPermission(portalModules.STOCK_TRANSFER_REQUEST, permissions.READ) ||
      checkUserPermission(portalModules.STOCK_TRANSFER, permissions.CREATE),
    controller.get,
  );

router
  .route("/items")
  .get(
    checkUserPermission(portalModules.STOCK_TRANSFER_REQUEST, permissions.READ) ||
      checkUserPermission(portalModules.STOCK_TRANSFER, permissions.CREATE),
    controller.getItems,
  );

module.exports = router;
