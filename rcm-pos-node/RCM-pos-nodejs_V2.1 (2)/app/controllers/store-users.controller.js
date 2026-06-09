const {
  createStoreUser,
  getStoreUser,
  updateStoreUser,
  deleteStoreUser,
  parentPrimaryKey,
} = require("../entities/services/store-users.service");
const { formatDate } = require("../utils/utils");

// Create and Save a new StoreUser
exports.create = async (req, res, next) => {
  console.log("Create StoreUser - req.body: ", req.body);
  console.log("Create StoreUser - req.params: ", req.params);
  // Validate request
  if (!req.body || !req.params[parentPrimaryKey]) {
    res.status(400).send({
      message: "Invalid request!",
    });
    return;
  }

  const createdBy = req.session.userId;
  const createdAt = formatDate(new Date(), "YYYY-MM-DD HH24:MI:SS.FF2");
  try {
    const newRec = await createStoreUser(
      req.body,
      req.params[parentPrimaryKey],
      createdBy,
      createdAt,
    );
    res.send(newRec);
  } catch (err) {
    console.error("Error creating StoreUser!");
    next(err);
  }
};

// Retrieve all StoreUser from the database.
exports.findAll = async (req, res, next) => {
  const filter = { ...req.params, ...req.query };
  console.log("req.params: ", JSON.stringify(req.params));
  console.log("req.query: ", JSON.stringify(req.query));
  try {
    const response = await getStoreUser(filter);
    res.send(response);
  } catch (err) {
    console.error("Error getting StoreUser!");
    next(err);
  }
};

// Find a single StoreUser with an id
exports.findOne = async (req, res, next) => {
  // const id = req.params.id;
  try {
    const response = await getStoreUser(req.params, 1);
    res.send(response);
  } catch (err) {
    console.error("Error getting StoreUser!");
    next(err);
  }
};

exports.update = async (req, res, next) => {
  if (req.body) {
    const modifiedBy = req.session.userId;
    const modifiedAt = formatDate(new Date(), "YYYY-MM-DD HH24:MI:SS.FF2");
    try {
      const response = await updateStoreUser(req.body, modifiedBy, modifiedAt);
      res.send(response);
    } catch (err) {
      console.error("Error updating StoreUser!");
      next(err);
    }
  } else {
    res.status(400).send({
      message: "Invalid request!",
    });
  }
};

// Delete a StoreUser with the specified id in the request
exports.delete = async (req, res, next) => {
  if (!req.params.id) {
    res.status(400).send({ message: "Invalid Id!" });
    return;
  }
  try {
    const response = await deleteStoreUser(req.params);
    res.send(response);
  } catch (err) {
    console.error("Error deleting StoreUser!");
    next(err);
  }
};

/**
 * Deletes ALL the StoreUser under a given Store
 */
exports.deleteAll = async (req, res, next) => {
  if (!req.params[parentPrimaryKey]) {
    res.status(400).send({ message: "Invalid Id!" });
    return;
  }

  try {
    const response = await deleteStoreUser(req.params);
    res.send(response);
  } catch (err) {
    console.error("Error deleting StoreUser!");
    next(err);
  }
};
