const express = require("express");
const router = new express.Router();
const controller = require("../controllers/custom-firca.js");
const { checkUserPermission } = require("../handler/session-handler");
const { portalModules, permissions } = require("../config/config");

//Base URL: /api/v1/custom/firca
router
  .route("/")
  .post(checkUserPermission(portalModules.INVOICE, permissions.READ), controller.createFirca);

module.exports = router;
