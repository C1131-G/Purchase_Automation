/**
 * SAMPLE - NOT Required for POS
 */

const express = require("express");
const controller = require("../controllers/service-layer-delivery");
const { portalModules, permissions } = require("../config/config");
const { checkUserPermission } = require("../handler/session-handler");

const router = new express.Router();

//Base URL: api/v1/service/delivery
router
  .route("/")
  .post(checkUserPermission(portalModules.DELIVERY, permissions.CREATE), controller.create);

router
  .route("/draft")
  .patch(checkUserPermission(portalModules.DELIVERY, permissions.WRITE), controller.update);

router
  .route("/items/:recordType?")
  .get(checkUserPermission(portalModules.DELIVERY, permissions.READ), controller.get);

module.exports = router;
