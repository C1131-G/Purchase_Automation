const express = require("express");
const controller = require("../controllers/service-layer-business-partner");
const { portalModules, permissions } = require("../config/config");
const { checkUserPermission } = require("../handler/session-handler");

const router = new express.Router();

//Base URL: api/v1/service/business-partner
router
  .route("/")
  .post(checkUserPermission([portalModules.INVOICE], permissions.CREATE), controller.create);

module.exports = router;
