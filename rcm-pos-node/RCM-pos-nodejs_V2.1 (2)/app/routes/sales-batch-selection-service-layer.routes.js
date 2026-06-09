const express = require("express");
const controller = require("../controllers/service-layer-sales-batch-selection.js");
const { portalModules, permissions } = require("../config/config");
const { checkUserPermission } = require("../handler/session-handler");

const router = new express.Router();

//Base URL: api/v1/service/sales-batch-selection
router
  .route("/")
  .post(checkUserPermission([portalModules.INVOICE], permissions.CREATE), controller.create)
  .put(checkUserPermission(portalModules.INVOICE, permissions.WRITE), controller.update);

router
  .route("/get")
  .post(checkUserPermission([portalModules.INVOICE], permissions.READ), controller.get);

module.exports = router;
