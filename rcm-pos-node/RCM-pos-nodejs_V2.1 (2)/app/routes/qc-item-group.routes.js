/**
 * SAMPLE - NOT Required for POS
 */

const express = require("express");
const qcItemGroup = require("../controllers/qc-item-group.controller.js");
const qcItemGroupMembers = require("../controllers/qc-item-group-members.controller.js");
const { parentPrimaryKey } = require("../entities/services/qc-item-group-members.service");

const router = new express.Router();

//Base URL: /api/v1/custom/qc-item-group

/**
 * Routes for QC Item Group
 **/
// Create a new QCItemGroup
router.post("/", qcItemGroup.create);

// Retrieve all QCItemGroup
router.get("/", qcItemGroup.findAll);

// Retrieve a single QCItemGroup with id
router.get("/:id", qcItemGroup.findOne);

// Update a QCItemGroup with id
router.put("/:id", qcItemGroup.update);

// Delete a QCItemGroup with id
router.delete("/:id", qcItemGroup.delete);

/**
 * Routes for QC Item Group Members (Items under QCItemGroup)
 **/
router.post(`/:${parentPrimaryKey}/item/`, qcItemGroupMembers.create);

//Get All QCItemGroupMembers under a QCItemGroup
router.get(`/:${parentPrimaryKey}/item/`, qcItemGroupMembers.findAll);

//Get QCItemGroupMembers based on 'filter' params passed
router.get(`/item/find`, qcItemGroupMembers.findAll);

//Get ONE QCItemGroupMembers based on PK
router.get("/item/:id", qcItemGroupMembers.findOne);

//Update ONE QCItemGroupMembers based on PK
router.put("/item/:id", qcItemGroupMembers.update);

//Delete ONE QCItemGroupMembers based on PK
router.delete("/item/:id", qcItemGroupMembers.delete);

//Delete ALL QCItemGroupMembers under a QCItemGroup
router.delete(`/:${parentPrimaryKey}/item`, qcItemGroupMembers.deleteAll);

module.exports = router;
