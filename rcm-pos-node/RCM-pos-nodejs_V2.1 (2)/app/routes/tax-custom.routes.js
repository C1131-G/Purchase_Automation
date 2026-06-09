const express = require("express");
const router = new express.Router();
const controller = require("../controllers/custom-tax");
const { checkUserPermission } = require("../handler/session-handler");
const { portalModules, permissions } = require("../config/config");

//Base URL: /api/v1/custom/tax
router.route("/").get(controller.get);

module.exports = router;
