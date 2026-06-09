/**
 * SAMPLE - NOT Required for POS
 */

const express = require("express");
const router = new express.Router();
const { checkUserPermission } = require("../handler/session-handler");
const delivery = require("../controllers/custom-delivery");

const { portalModules, permissions } = require("../config/config");

//Base URL: /api/v1/custom/delivery
router.route("/").get(checkUserPermission(portalModules.DELIVERY, permissions.READ), delivery.get);

router
  .route("/items/:recordType?")
  .get(checkUserPermission(portalModules.DELIVERY, permissions.READ), delivery.getItems);

router.route("/tax/:recordType?").get(delivery.getTax);

module.exports = router;
