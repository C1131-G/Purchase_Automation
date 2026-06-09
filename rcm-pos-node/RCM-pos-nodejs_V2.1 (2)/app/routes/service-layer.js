const express = require("express");
const serviceLayerUser = require("../controllers/service-layer-user");
const stockTransferRequest = require("../controllers/service-layer-stock-transfer-request");
const stockTransfer = require("../controllers/service-layer-stock-transfer");
const serviceLayerLogin = require("../controllers/service-layer-login");
const { portalModules, permissions } = require("../config/config");
const { checkUserPermission } = require("../handler/session-handler");

const router = new express.Router();

router.route("/login").post(serviceLayerLogin.validateUserLogin);

router
  .route("/users")
  .patch(
    checkUserPermission(portalModules.USER, permissions.WRITE),
    serviceLayerUser.updateUserDetails,
  );

router
  .route("/stock-transfer-request")
  .post(
    checkUserPermission(portalModules.STOCK_TRANSFER_REQUEST, permissions.CREATE),
    stockTransferRequest.createStockTransferRequest,
  )
  .patch(
    checkUserPermission(portalModules.STOCK_TRANSFER_REQUEST, permissions.WRITE),
    stockTransferRequest.updateDraft,
  );

// router.route("/stock-transfer")
// .post(checkUserPermission(portalModules.STOCK_TRANSFER, permissions.CREATE), stockTransfer.createStockTransfer)
// .patch(checkUserPermission(portalModules.STOCK_TRANSFER, permissions.WRITE), stockTransfer.updateDraft);

module.exports = router;
