/**
 * SAMPLE - NOT Required for POS
 */

const itemGroupService = require("../entities/services/qc-item-group.service");

// Create and Save a new QCItemGroup
exports.create = async (req, res, next) => {
  // Validate request
  if (!req.body || !req.body.groupName) {
    res.status(400).send({
      message: "Invalid request!",
    });
    return;
  }
  console.log("req.body: ", req.body);

  try {
    const newRec = await itemGroupService.createQCItemGroup(req.body);
    res.send(newRec);
  } catch (err) {
    console.error("Error creating QCItemGroup!");
    next(err);
  }
};

// Retrieve all QCItemGroup from the database.
exports.findAll = async (req, res, next) => {
  try {
    const response = await itemGroupService.getQCItemGroup(req.query);
    res.send(response);
  } catch (err) {
    console.error("Error getting QCItemGroup!");
    next(err);
  }
};

// Find a single QCItemGroup with an id
exports.findOne = async (req, res, next) => {
  try {
    const response = await itemGroupService.getQCItemGroup(req.params, 1);
    res.send(response);
  } catch (err) {
    console.error("Error getting QCItemGroup!");
    next(err);
  }
};

exports.update = async (req, res, next) => {
  if (req.params.id && req.body) {
    try {
      const response = await itemGroupService.updateQCItemGroup(req.params.id, req.body);
      res.send(response);
    } catch (err) {
      console.error("Error updating QCItemGroup!");
      next(err);
    }
  } else {
    res.status(400).send({
      message: "Invalid request!",
    });
  }
};

// Delete a QCItemGroup with the specified id in the request
exports.delete = async (req, res, next) => {
  try {
    const response = await itemGroupService.deleteQCItemGroup(req.params.id);
    res.send(response);
  } catch (err) {
    console.error("Error deleting QCItemGroup!");
    next(err);
  }
};
