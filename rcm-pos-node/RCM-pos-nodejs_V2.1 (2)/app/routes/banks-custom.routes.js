const express = require("express");
const router = new express.Router();
const controller = require("../controllers/custom-banks.js");

//Base URL: /api/v1/custom/banks
router.route("/").get(controller.get);

module.exports = router;
