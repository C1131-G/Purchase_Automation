const express = require("express");
const router = new express.Router();
const controller = require("../controllers/custom-credit-memo-request.js");
const { checkUserPermission } = require("../handler/session-handler");
const { portalModules, permissions } = require("../config/config");

//Base URL: /api/v1/custom/credit-memo-request
router
  .route("/")
  .get(checkUserPermission(portalModules.CREDIT_MEMO_REQUEST, permissions.READ), controller.get);

router
  .route("/items")
  .get(
    checkUserPermission(portalModules.CREDIT_MEMO_REQUEST, permissions.READ),
    controller.getItems,
  );

module.exports = router;
