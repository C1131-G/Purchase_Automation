const service = require("../entities/services/parked-transactions.service.js");
const { formatDate } = require("../utils/utils");

/**
 * Create and Save a new ParkedTransaction
 */
exports.create = async (req, res, next) => {
  // Validate request
  if (!req.body || !req.body.transactionType || !req.body.data) {
    res.status(400).send({
      message: "Invalid request!",
    });
    return;
  }

  console.log("req.body: ", req.body);
  try {
    const { userSessionLog } = req.session;
    req.body.userId = userSessionLog.userId;
    req.body.userName = userSessionLog.userName;
    ((req.body.storeId = userSessionLog.storeId),
      (req.body.storeLocation = userSessionLog.storeLocation),
      (req.body.storeCounterId = userSessionLog.storeCounterId),
      (req.body.counterCode = userSessionLog.counterCode),
      (req.body.parkedDateTime = formatDate(new Date(), "YYYY-MM-DD HH24:MI:SS.FF2")));

    let { data } = req.body;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      data = JSON.stringify(data);
      req.body.data = data;
    }

    // Get the latest nextRefNum
    const nextRefNum = await service.getLatestNextRefNum();
    req.body.transactionRefNum = `${nextRefNum}-${formatDate(new Date(), "ddmm")}`;
    req.body.nextRefNum = nextRefNum + 1;

    const newRec = await service.createParkedTransaction(req.body);
    res.send({ id: newRec.parkedTransactionId });
  } catch (err) {
    console.error("Error creating ParkedTransaction!");
    next(err);
  }
};

/**
 * Retrieve all ParkedTransaction from the database
 */
exports.findAll = async (req, res, next) => {
  try {
    // By default filter the Trxs from user's Store
    storeId = req.session.userSessionLog.storeId;
    const response = await service.getParkedTransaction(req.query, storeId);
    res.send(response);
  } catch (err) {
    console.error("Error getting ParkedTransaction!");
    next(err);
  }
};

/**
 * Find a single ParkedTransaction with an id
 */
exports.findOne = async (req, res, next) => {
  try {
    const response = await service.getParkedTransaction(req.params, 1);
    res.send(response);
  } catch (err) {
    console.error("Error getting ParkedTransaction!");
    next(err);
  }
};

/**
 * Delete a ParkedTransaction with PK
 */
exports.delete = async (req, res, next) => {
  try {
    const response = await service.deleteParkedTransaction(req.params.id);
    res.send(response);
  } catch (err) {
    console.error("Error deleting ParkedTransaction!");
    next(err);
  }
};
