const express = require("express");
const userGroup = require("../controllers/user-groups.controller.js");

const router = new express.Router();

//Base URL: /api/v1/custom/user/group

// Create a new UserGroup
router.post("/", userGroup.create);

// Retrieve all UserGroup
router.get("/", userGroup.findAll);

// Retrieve a single UserGroup with id
router.get("/:id", userGroup.findOne);

// Update a UserGroup with id
router.put("/:id", userGroup.update);

// Delete a UserGroup with id
router.delete("/:id", userGroup.delete);

module.exports = router;
