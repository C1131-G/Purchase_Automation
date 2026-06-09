const express = require("express");
const router = new express.Router();
const controller = require("../controllers/custom-credit-card.js");
const { checkUserPermission } = require("../handler/session-handler.js");
const { portalModules, permissions } = require("../config/config.js");

//Base URL: /api/v1/custom/credit-card
router.route("/").get(checkUserPermission(portalModules.INVOICE, permissions.READ), controller.get);

module.exports = router;
