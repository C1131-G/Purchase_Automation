/**
 * SAMPLE - NOT Required for POS
 */

const express = require("express");
const router = new express.Router();
const saleOrder = require("../controllers/custom-sale-order");

//Base URL: /api/v1/custom/sale-order
router.route("/").get(saleOrder.get);
router.route("/items").get(saleOrder.getItems);

module.exports = router;
