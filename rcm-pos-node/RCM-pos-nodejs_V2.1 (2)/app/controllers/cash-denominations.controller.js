const service = require("../entities/services/cash-denominations.service");
const mandatoryField = "trxType";

// Create and Save a new Cash Denomination entry
exports.create = async (req, res, next) => {
  // Validate request
  if (!req.body || !req.body[mandatoryField]) {
    res.status(400).send({
      message: "Invalid request!",
    });
    return;
  }
  console.log("req.body: ", req.body);
  try {
    const newRec = await service.createCashDenomination(req.body);
    res.send(newRec);
  } catch (err) {
    console.error("Error creating CashDenomination!");
    next(err);
  }
};

// Retrieve all CashDenominations from the database.
exports.findAll = async (req, res, next) => {
  try {
    const response = await service.getCashDenominations(req.query);
    res.send(response);
  } catch (err) {
    console.error("Error getting CashDenomination!");
    next(err);
  }
};

// Delete a CashDenomination with the specified id in the request
exports.delete = async (req, res, next) => {
  try {
    const response = await service.deleteCashDenominations(req.params.id);
    res.send(response);
  } catch (err) {
    console.error("Error deleting CashDenomination!");
    next(err);
  }
};
