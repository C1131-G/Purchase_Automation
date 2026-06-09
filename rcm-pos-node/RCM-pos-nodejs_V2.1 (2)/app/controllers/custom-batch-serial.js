const { setBatchSerialReservedCust } = require("../helper/items");

/**
 * Set Customer Info
 */
exports.patch = (req, res) => {
  console.log("*** setBatchSerialReservedCust - req.params: " + JSON.stringify(req.params));
  try {
    const rows = setBatchSerialReservedCust(
      req.params.batchNumber,
      req.params.serialNumber,
      req.params.customerCode,
    );
    console.log("setBatchSerialReservedCust %s", JSON.stringify(rows));
    res.send(rows);
  } catch (err) {
    console.log("setBatchSerialReservedCust - controller - error: " + JSON.stringify(err));
    let message = "Something went wrong. Please try again or contact your administrator";
    if (err.message) message = err.message;
    res.status(500).send({ message });
  }
};
