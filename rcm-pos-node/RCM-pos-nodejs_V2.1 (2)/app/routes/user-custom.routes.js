const express = require("express");
const router = new express.Router();
const controller = require("../controllers/custom-user.js");

//Base URL: /api/v1/custom/user
router.route("/sales-employee").get(controller.getSalesEmployee);

module.exports = router;
