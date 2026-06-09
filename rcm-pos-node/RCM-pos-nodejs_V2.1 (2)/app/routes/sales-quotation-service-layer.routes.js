const express = require("express");
const controller = require("../controllers/service-layer-sales-quotation");
const { portalModules, permissions } = require("../config/config");
const { checkUserPermission } = require("../handler/session-handler");

const router = new express.Router();

//Base URL: api/v1/service/sales-quotation
router
  .route("/")
  .post(
    checkUserPermission([portalModules.SALES_QUOTATION], permissions.CREATE),
    controller.create,
  );

router
  .route("/")
  .patch(checkUserPermission(portalModules.SALES_QUOTATION, permissions.WRITE), controller.update);

module.exports = router;
