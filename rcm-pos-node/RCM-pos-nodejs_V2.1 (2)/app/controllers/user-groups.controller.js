const userGroupService = require("../entities/services/user-groups.service");

// Create and Save a new UserGroup
exports.create = async (req, res, next) => {
  // Validate request
  if (!req.body || !req.session.userId || !req.body.groupId) {
    res.status(400).send({
      message: "Invalid request!",
    });
    return;
  }
  console.log("req.body: ", req.body);

  try {
    const newRec = await userGroupService.createUserGroup(req.body);
    res.send(newRec);
  } catch (err) {
    console.error("Error creating UserGroup!");
    next(err);
  }
};

// Retrieve all UserGroup from the database.
exports.findAll = async (req, res, next) => {
  try {
    const response = await userGroupService.getUserGroup(req.query);
    res.send(response);
  } catch (err) {
    console.error("Error getting UserGroup!");
    next(err);
  }
};

// Find a single UserGroup with an id
exports.findOne = async (req, res, next) => {
  try {
    const response = await userGroupService.getUserGroup(req.params, 1);
    res.send(response);
  } catch (err) {
    console.error("Error getting UserGroup!");
    next(err);
  }
};

exports.update = async (req, res, next) => {
  if (req.params.id && req.body) {
    try {
      const response = await userGroupService.updateUserGroup(req.params.id, req.body);
      res.send(response);
    } catch (err) {
      console.error("Error updating UserGroup!");
      next(err);
    }
  } else {
    res.status(400).send({
      message: "Invalid request!",
    });
  }
};

// Delete a UserGroup with the specified id in the request
exports.delete = async (req, res, next) => {
  try {
    const response = await userGroupService.deleteUserGroup(req.params.id);
    res.send(response);
  } catch (err) {
    console.error("Error deleting UserGroup!");
    next(err);
  }
};
