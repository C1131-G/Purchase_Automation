const express = require("express");
const router = new express.Router();
const controller = require("../controllers/custom-sales-employees.js");

//Base URL: /api/v1/custom/sales-employees
router.route("/").get(controller.get);

module.exports = router;
