const express = require("express");
const controller = require("../controllers/service-layer-credit-memo");
const { portalModules, permissions } = require("../config/config");
const { checkUserPermission } = require("../handler/session-handler");

const router = new express.Router();

//Base URL: api/v1/service/credit-memo
router
  .route("/")
  .post(checkUserPermission([portalModules.CREDIT_MEMO], permissions.CREATE), controller.create);

module.exports = router;
