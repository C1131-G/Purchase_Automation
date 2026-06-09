const session = require("../controllers/session.controller");
const express = require("express");
const router = new express.Router();

//Base URL: /api/v1/custom/session

//Get User Info from session
router.get("/", session.get);

//Destroy session
router.delete("/logout", session.delete);

module.exports = router;
