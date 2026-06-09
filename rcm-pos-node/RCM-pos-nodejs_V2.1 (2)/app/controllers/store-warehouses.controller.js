const {
  createStoreWarehouse,
  getStoreWarehouse,
  updateStoreWarehouse,
  deleteStoreWarehouse,
  parentPrimaryKey,
} = require("../entities/services/store-warehouses.service");
const { formatDate } = require("../utils/utils");

// Create and Save a new StoreWarehouse
exports.create = async (req, res, next) => {
  console.log("Create StoreWarehouse - req.body: ", req.body);
  console.log("Create StoreWarehouse - req.params: ", req.params);
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
    const newRec = await createStoreWarehouse(
      req.body,
      req.params[parentPrimaryKey],
      createdBy,
      createdAt,
    );
    res.send(newRec);
  } catch (err) {
    console.error("Error creating StoreWarehouse!");
    next(err);
  }
};

// Retrieve all StoreWarehouse from the database.
exports.findAll = async (req, res, next) => {
  const filter = { ...req.params, ...req.query };
  console.log("req.params: ", JSON.stringify(req.params));
  console.log("req.query: ", JSON.stringify(req.query));
  try {
    const response = await getStoreWarehouse(filter);
    res.send(response);
  } catch (err) {
    console.error("Error getting StoreWarehouse!");
    next(err);
  }
};

// Find a single StoreWarehouse with an id
exports.findOne = async (req, res, next) => {
  // const id = req.params.id;
  try {
    const response = await getStoreWarehouse(req.params, 1);
    res.send(response);
  } catch (err) {
    console.error("Error getting StoreWarehouse!");
    next(err);
  }
};

exports.update = async (req, res, next) => {
  if (req.body) {
    const modifiedBy = req.session.userId;
    const modifiedAt = formatDate(new Date(), "YYYY-MM-DD HH24:MI:SS.FF2");
    try {
      const response = await updateStoreWarehouse(req.body, modifiedBy, modifiedAt);
      res.send(response);
    } catch (err) {
      console.error("Error updating StoreWarehouse!");
      next(err);
    }
  } else {
    res.status(400).send({
      message: "Invalid request!",
    });
  }
};

// Delete a StoreWarehouse with the specified id in the request
exports.delete = async (req, res, next) => {
  if (!req.params.id) {
    res.status(400).send({ message: "Invalid Id!" });
    return;
  }
  try {
    const response = await deleteStoreWarehouse(req.params);
    res.send(response);
  } catch (err) {
    console.error("Error deleting StoreWarehouse!");
    next(err);
  }
};

/**
 * Deletes ALL the StoreWarehouse under a given Store
 */
exports.deleteAll = async (req, res, next) => {
  if (!req.params[parentPrimaryKey]) {
    res.status(400).send({ message: "Invalid Id!" });
    return;
  }

  try {
    const response = await deleteStoreWarehouse(req.params);
    res.send(response);
  } catch (err) {
    console.error("Error deleting StoreWarehouse!");
    next(err);
  }
};
