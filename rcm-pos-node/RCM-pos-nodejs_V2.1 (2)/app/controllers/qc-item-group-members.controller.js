/**
 * SAMPLE - NOT Required for POS
 */

const {
  createQCItemGroupMember,
  getQCItemGroupMember,
  updateQCItemGroupMember,
  deleteQCItemGroupMember,
  parentPrimaryKey,
} = require("../entities/services/qc-item-group-members.service");

// Create and Save a new QCItemGroupMembers
exports.create = async (req, res, next) => {
  console.log("Create QCItemGroupMember - req.body: ", req.body);
  console.log("Create QCItemGroupMember - req.params: ", req.params);
  // Validate request
  if (!req.body || !req.params[parentPrimaryKey]) {
    res.status(400).send({
      message: "Invalid request!",
    });
    return;
  }
  console.log("req.body: ", req.body);

  // const data = {...req.params, ...req.body};
  try {
    const newRec = await createQCItemGroupMember(req.body, req.params[parentPrimaryKey]);
    res.send(newRec);
  } catch (err) {
    console.error("Error creating QCItemGroupMembers!");
    next(err);
  }
};

// Retrieve all QCItemGroupMembers from the database.
exports.findAll = async (req, res, next) => {
  const filter = { ...req.params, ...req.query };
  console.log("req.params: ", JSON.stringify(req.params));
  console.log("req.query: ", JSON.stringify(req.query));
  try {
    const response = await getQCItemGroupMember(filter);
    res.send(response);
  } catch (err) {
    console.error("Error getting QCItemGroupMembers!");
    next(err);
  }
};

// Find a single QCItemGroupMembers with an id
exports.findOne = async (req, res, next) => {
  // const id = req.params.id;
  try {
    const response = await getQCItemGroupMember(req.params, 1);
    res.send(response);
  } catch (err) {
    console.error("Error getting QCItemGroupMembers!");
    next(err);
  }
};

exports.update = async (req, res, next) => {
  if (req.params.id && req.body) {
    try {
      const response = await updateQCItemGroupMember(req.params.id, req.body);
      res.send(response);
    } catch (err) {
      console.error("Error updating QCItemGroupMembers!");
      next(err);
    }
  } else {
    res.status(400).send({
      message: "Invalid request!",
    });
  }
};

// Delete a QCItemGroupMembers with the specified id in the request
exports.delete = async (req, res, next) => {
  if (!req.params.id) {
    res.status(400).send({ message: "Invalid Id!" });
    return;
  }
  try {
    const response = await deleteQCItemGroupMember(req.params);
    res.send(response);
  } catch (err) {
    console.error("Error deleting QCItemGroupMembers!");
    next(err);
  }
};

/**
 * Deletes ALL the QCItemGroupMembers under a given QCItemGroup
 */
exports.deleteAll = async (req, res, next) => {
  if (!req.params[parentPrimaryKey]) {
    res.status(400).send({ message: "Invalid Id!" });
    return;
  }

  try {
    const response = await deleteQCItemGroupMember(req.params);
    res.send(response);
  } catch (err) {
    console.error("Error deleting QCItemGroupMembers!");
    next(err);
  }
};
