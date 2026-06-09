const express = require("express");
const router = new express.Router();
const controller = require("../controllers/custom-invoice.js");
const { checkUserPermission } = require("../handler/session-handler");
const { portalModules, permissions } = require("../config/config");

//Base URL: /api/v1/custom/invoice
router.route("/").get(checkUserPermission(portalModules.INVOICE, permissions.READ), controller.get);

router
  .route("/reprint")
  .patch(checkUserPermission(portalModules.INVOICE, permissions.READ), controller.updateReprint);

router
  .route("/items")
  .get(checkUserPermission(portalModules.INVOICE, permissions.READ), controller.getItems);

router
  .route("/firca-code")
  .get(checkUserPermission(portalModules.INVOICE, permissions.READ), controller.getFircaQRCode);

router
  .route("/delivery-code")
  .get(checkUserPermission(portalModules.INVOICE, permissions.READ), controller.getDeliveryCode);

router
  .route("/delivery-confirmation")
  .post(
    checkUserPermission(portalModules.INVOICE, permissions.READ),
    controller.checkDeliveryConfirmation,
  );

module.exports = router;
