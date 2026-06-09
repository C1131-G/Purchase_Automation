const express = require("express");
const router = new express.Router();
const controller = require("../controllers/custom-credit-memo");
const { checkUserPermission } = require("../handler/session-handler");
const { portalModules, permissions } = require("../config/config");

//Base URL: /api/v1/custom/credit-memo
router
  .route("/")
  .get(checkUserPermission(portalModules.CREDIT_MEMO, permissions.READ), controller.get);

router
  .route("/items")
  .get(checkUserPermission(portalModules.CREDIT_MEMO, permissions.READ), controller.getItems);

module.exports = router;
