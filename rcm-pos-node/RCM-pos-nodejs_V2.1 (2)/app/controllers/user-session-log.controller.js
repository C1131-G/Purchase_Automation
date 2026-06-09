const service = require("../entities/services/user-session-log.service");
const storeWarehouseService = require("../entities/services/store-warehouses.service");
const storeService = require("../entities/services/stores.service");
const { formatDate } = require("../utils/utils");
const { canAssignUserToCounter } = require("../helper/user-session-log.js");

// Create and Save a new SessionLog
exports.create = async (req, res, next) => {
  // Validate request
  if (!req.body) {
    res.status(400).send({
      message: "Invalid request!",
    });
    return;
  }

  console.log("req.body: ", req.body);
  try {
    let temp = true;
    if (req.body.storeCounterId) {
      //validate the request only when the payload contains the `storeCounterId`
      temp = await canAssignUserToCounter(req.session.userId, req.body.storeCounterId);
    }
    if (temp) {
      // req.body.userId = req.session.userId;
      req.body.loginTime = formatDate(new Date(), "YYYY-MM-DD HH24:MI:SS.FF2");
      const newRec = await service.createUserSessionLog(req.body);
      res.send(newRec);
    }
  } catch (err) {
    console.error("Error creating UserSessionLog!");
    next(err);
  }
};

// Retrieve all UserSessionLog from the database.
exports.findAll = async (req, res, next) => {
  try {
    const response = await service.getUserSessionLog(req.query);
    res.send(response);
  } catch (err) {
    console.error("Error getting UserSessionLog!");
    next(err);
  }
};

// Find a single UserSessionLog with an id
exports.findOne = async (req, res, next) => {
  try {
    const response = await service.getUserSessionLog(req.params, 1);
    res.send(response);
  } catch (err) {
    console.error("Error getting UserSessionLog!");
    next(err);
  }
};

exports.update = async (req, res, next) => {
  if (req.params.id && req.body) {
    try {
      let temp = true;
      if (req.body.storeCounterId) {
        //validate the request only when the request is to update `storeCounterId`
        temp = await canAssignUserToCounter(req.session.userId, req.body.storeCounterId);
      }
      if (temp) {
        let storeLocation = "",
          locationCode = "";
        if (req.body.storeId) {
          // `Location` added to session to be used at SQ creation
          const store = await storeService.getStore({ storeId: req.body.storeId });
          console.log("store: ", store[0]);
          if (Array.isArray(store) && store.length > 0) {
            locationCode = store[0].locationCode;
            storeLocation = store[0].location;
            //Note: Adding `location` to the session & `UserLog` table
            req.body.storeLocation = storeLocation;
            req.session.userSessionLog.storeLocation = storeLocation;

            // Adding `LocationCode` only to the session, will be used to filter WHs
            req.session.userSessionLog.locationCode = locationCode;
          }
        }

        const response = await service.updateUserSessionLog(req.params.id, req.body);
        console.log("user-session-log.controller - update - response: ", response);

        let storeWHCode = "";
        //Set the `counter` info to `session` as well
        if (req.body.storeId && req.body.storeCounterId && req.body.counterCode) {
          req.session.userSessionLog.storeId = req.body.storeId;
          req.session.userSessionLog.storeCounterId = req.body.storeCounterId;
          req.session.userSessionLog.counterCode = req.body.counterCode;
          req.session.userSessionLog.counterName = counterName;

          const storeWarehouse = await storeWarehouseService.getStoreWarehouse({
            storeId: req.body.storeId,
          });
          console.log("storeWarehouse: ", storeWarehouse[0]);
          if (Array.isArray(storeWarehouse) && storeWarehouse.length > 0) {
            storeWHCode = storeWarehouse[0].warehouseCode;
            //Note: Adding `setStoreWHCode` to the session alone, WO adding to `UserLog` table
            req.session.storeWHCode = storeWHCode;
          }
        }

        res.send({ ...response, storeWHCode, storeLocation, locationCode });
      }
    } catch (err) {
      console.error("Error updating UserSessionLog!");

      //Reset below values in Session when something goes wrong when setting any of these values
      req.session.userSessionLog.storeId = "";
      req.session.userSessionLog.storeCounterId = "";
      req.session.userSessionLog.counterCode = "";
      req.session.storeWHCode = "";
      next(err);
    }
  } else {
    res.status(400).send({
      message: "Invalid request!",
    });
  }
};

// Delete a UserSessionLog with the specified id in the request
exports.delete = async (req, res, next) => {
  try {
    const response = await service.deleteUserSessionLog(req.params.id);
    res.send(response);
  } catch (err) {
    console.error("Error deleting UserSessionLog!");
    next(err);
  }
};
