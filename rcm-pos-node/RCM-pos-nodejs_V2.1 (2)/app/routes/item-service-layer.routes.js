const express = require("express");
const controller = require("../controllers/service-layer-item.js");
const { portalModules, permissions } = require("../config/config.js");
const { checkUserPermission } = require("../handler/session-handler.js");

const router = new express.Router();

//Base URL: api/v1/service/item
router
  .route("/")
  // .post(checkUserPermission([portalModules.INVOICE], permissions.CREATE), controller.create);
  .post(controller.create);

module.exports = router;
