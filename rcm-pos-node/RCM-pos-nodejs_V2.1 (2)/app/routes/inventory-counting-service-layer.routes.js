const express = require("express");
const controller = require("../controllers/service-layer-inventory-counting.js");
const { portalModules, permissions } = require("../config/config");
const { checkUserPermission } = require("../handler/session-handler");

const router = new express.Router();

//Base URL: api/v1/service/inventory-counting
router
  .route("/")
  // .post(checkUserPermission([portalModules.INVENTORY_COUNTING], permissions.CREATE), controller.create);
  .post(controller.create);

router.route("/").patch(controller.update);

module.exports = router;
