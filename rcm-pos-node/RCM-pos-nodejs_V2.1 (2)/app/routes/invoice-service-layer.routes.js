const express = require("express");
const controller = require("../controllers/service-layer-invoice");
const { portalModules, permissions } = require("../config/config");
const { checkUserPermission } = require("../handler/session-handler");
const serviceLayerHelper = require("../helper/service-layer-invoice.js");

const router = new express.Router();
// Ensure `upload` is correctly imported
const { upload } = serviceLayerHelper;

//Base URL: api/v1/service/invoice
router
  .route("/")
  .post(checkUserPermission([portalModules.INVOICE], permissions.CREATE), controller.create);
router
  .route("/")
  .patch(
    checkUserPermission([portalModules.INVOICE], permissions.WRITE),
    upload.single("Attachment"),
    controller.update,
  );
router
  .route("/attachment")
  .patch(
    checkUserPermission([portalModules.INVOICE], permissions.WRITE),
    upload.single("Attachment"),
    controller.updateAttach,
  );

module.exports = router;
