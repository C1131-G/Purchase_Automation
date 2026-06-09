const express = require("express");
const parkedTransaction = require("../controllers/parked-transactions.controller.js");

const router = new express.Router();

//Base URL: /api/v1/custom/parked-transaction

// Create a new ParkedTransaction
router.post("/", parkedTransaction.create);

// Retrieve all ParkedTransaction
router.get("/", parkedTransaction.findAll);

// Retrieve a single ParkedTransaction with id
router.get("/:id", parkedTransaction.findOne);

// Delete a ParkedTransaction with id
router.delete("/:id", parkedTransaction.delete);

module.exports = router;
