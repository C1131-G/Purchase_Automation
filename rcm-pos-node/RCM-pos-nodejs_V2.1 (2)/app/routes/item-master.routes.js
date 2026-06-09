const express = require("express");
const router = new express.Router();
const controller = require("../controllers/custom-item-master.js");
const { checkUserPermission } = require("../handler/session-handler");
const { portalModules, permissions } = require("../config/config");

//Base URL: /api/v1/custom/item-master
router
  .route("/")
  // .get(checkUserPermission(portalModules.ITEM, permissions.READ), controller.get);
  .get(controller.get);

router
  .route("/next-number")
  // .get(checkUserPermission(portalModules.ITEM, permissions.READ), controller.get);
  .get(controller.getNextNo);

router
  .route("/groups")
  // .get(checkUserPermission(portalModules.ITEM, permissions.READ), controller.getItems);
  .get(controller.getGroups);

router
  .route("/sub-groups/:subGroupId")
  // .get(checkUserPermission(portalModules.ITEM, permissions.READ), controller.getItems);
  .get(controller.getSubGroups);

module.exports = router;
