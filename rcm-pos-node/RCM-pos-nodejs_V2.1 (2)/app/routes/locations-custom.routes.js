const express = require("express");
const router = new express.Router();
const controller = require("../controllers/custom-locations.js");

//Base URL: /api/v1/custom/locations
router.route("/").get(controller.get);

module.exports = router;
