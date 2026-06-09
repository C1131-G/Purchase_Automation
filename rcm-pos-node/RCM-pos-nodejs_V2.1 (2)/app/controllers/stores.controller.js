const service = require("../entities/services/stores.service");
const { formatDate } = require("../utils/utils");
const mandatoryField = "storeName";

// Create and Save a new Store
exports.create = async (req, res, next) => {
  // Validate request
  if (!req.body || !req.body[mandatoryField]) {
    res.status(400).send({
      message: "Invalid request!",
    });
    return;
  }
  console.log("req.body: ", req.body);

  req.body.createdBy = req.session.userId;
  req.body.createdAt = formatDate(new Date(), "YYYY-MM-DD HH24:MI:SS.FF2");
  try {
    const newRec = await service.createStore(req.body);
    res.send(newRec);
  } catch (err) {
    console.error("Error creating Store!");
    next(err);
  }
};

// Retrieve all Store from the database.
exports.findAll = async (req, res, next) => {
  try {
    const response = await service.getStore(req.query);
    res.send(response);
  } catch (err) {
    console.error("Error getting Store!");
    next(err);
  }
};

// Find a single Store with an id
exports.findOne = async (req, res, next) => {
  try {
    const response = await service.getStore(req.params, 1);
    res.send(response);
  } catch (err) {
    console.error("Error getting Store!");
    next(err);
  }
};

exports.update = async (req, res, next) => {
  if (req.params.id && req.body) {
    req.body.modifiedBy = req.session.userId;
    req.body.modifiedAt = formatDate(new Date(), "YYYY-MM-DD HH24:MI:SS.FF2");
    try {
      const response = await service.updateStore(req.params.id, req.body);
      res.send(response);
    } catch (err) {
      console.error("Error updating Store!");
      next(err);
    }
  } else {
    res.status(400).send({
      message: "Invalid request!",
    });
  }
};

// Delete a Store with the specified id in the request
exports.delete = async (req, res, next) => {
  try {
    const response = await service.deleteStore(req.params.id);
    res.send(response);
  } catch (err) {
    console.error("Error deleting Store!");
    next(err);
  }
};
