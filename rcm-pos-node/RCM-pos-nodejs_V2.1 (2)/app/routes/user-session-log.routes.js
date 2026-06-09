const express = require("express");
const sessionLog = require("../controllers/user-session-log.controller.js");

const router = new express.Router();

//Base URL: /api/v1/custom/user-session-log

/**
 * Routes for User Session Log
 **/
// Create a new UserSessionLog - Added only for testing
router.post("/", sessionLog.create);

// Retrieve all UserSessionLog
router.get("/", sessionLog.findAll);

// Retrieve a single UserSessionLog with id
router.get("/:id", sessionLog.findOne);

// Update a UserSessionLog with id
router.put("/:id", sessionLog.update);

// Delete a UserSessionLog with id
router.delete("/:id", sessionLog.delete);

module.exports = router;
