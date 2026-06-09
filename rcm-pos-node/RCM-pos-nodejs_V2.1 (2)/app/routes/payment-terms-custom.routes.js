const express = require("express");
const router = new express.Router();
const controller = require("../controllers/custom-payment-terms.js");

//Base URL: /api/v1/custom/payment-terms
router.route("/").get(controller.get);

module.exports = router;
