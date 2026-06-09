const {
  createStoreCounter,
  getStoreCounter,
  updateStoreCounter,
  deleteStoreCounter,
  parentPrimaryKey,
} = require("../entities/services/store-counters.service");
const { formatDate } = require("../utils/utils");

// Create and Save a new StoreCounter
exports.create = async (req, res, next) => {
  console.log("Create StoreCounter - req.body: ", req.body);
  console.log("Create StoreCounter - req.params: ", req.params);
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
    const newRec = await createStoreCounter(
      req.body,
      req.params[parentPrimaryKey],
      createdBy,
      createdAt,
    );
    res.send(newRec);
  } catch (err) {
    console.error("Error creating StoreCounter!");
    next(err);
  }
};

// Retrieve all StoreCounter from the database.
exports.findAll = async (req, res, next) => {
  const filter = { ...req.params, ...req.query };
  console.log("req.params: ", JSON.stringify(req.params));
  console.log("req.query: ", JSON.stringify(req.query));
  try {
    const response = await getStoreCounter(filter);
    res.send(response);
  } catch (err) {
    console.error("Error getting StoreCounter!");
    next(err);
  }
};

// Find a single StoreCounter with an id
exports.findOne = async (req, res, next) => {
  // const id = req.params.id;
  try {
    const response = await getStoreCounter(req.params, 1);
    res.send(response);
  } catch (err) {
    console.error("Error getting StoreCounter!");
    next(err);
  }
};

exports.update = async (req, res, next) => {
  if (req.body) {
    const modifiedBy = req.session.userId;
    const modifiedAt = formatDate(new Date(), "YYYY-MM-DD HH24:MI:SS.FF2");
    try {
      const response = await updateStoreCounter(req.body, modifiedBy, modifiedAt);
      res.send(response);
    } catch (err) {
      console.error("Error updating StoreCounter!");
      next(err);
    }
  } else {
    res.status(400).send({
      message: "Invalid request!",
    });
  }
};

// Delete a StoreCounter with the specified id in the request
exports.delete = async (req, res, next) => {
  if (!req.params.id) {
    res.status(400).send({ message: "Invalid Id!" });
    return;
  }
  try {
    const response = await deleteStoreCounter(req.params);
    res.send(response);
  } catch (err) {
    console.error("Error deleting StoreCounter!");
    next(err);
  }
};

/**
 * Deletes ALL the StoreCounter under a given Store
 */
exports.deleteAll = async (req, res, next) => {
  if (!req.params[parentPrimaryKey]) {
    res.status(400).send({ message: "Invalid Id!" });
    return;
  }

  try {
    const response = await deleteStoreCounter(req.params);
    res.send(response);
  } catch (err) {
    console.error("Error deleting StoreCounter!");
    next(err);
  }
};
