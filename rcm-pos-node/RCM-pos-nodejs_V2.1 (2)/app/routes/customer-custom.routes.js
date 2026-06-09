const express = require("express");
const router = new express.Router();
const customerAPI = require("../controllers/custom-customer");

//Base URL: /api/v1/custom/customer
router.route("/").get(customerAPI.get);

router.route("/:cardCode/address").get(customerAPI.getAddress);

router.route("/:cardCode/contact-person").get(customerAPI.getContactPerson);

router.route("/:cardCode/special-price").get(customerAPI.getSpecialPrice);

module.exports = router;
