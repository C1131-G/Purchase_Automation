const express = require("express");
const router = new express.Router();
const controller = require("../controllers/custom-warehouse.js");

//Base URL: /api/v1/custom/warehouse
router.route("/").get(controller.get);

module.exports = router;
