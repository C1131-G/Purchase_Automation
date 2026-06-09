const express = require("express");
const store = require("../controllers/stores.controller.js");
const storeWarehouses = require("../controllers/store-warehouses.controller.js");
const storeCounters = require("../controllers/store-counters.controller.js");
const storeUsers = require("../controllers/store-users.controller.js");
const { parentPrimaryKey } = require("../entities/services/store-warehouses.service");

const { portalModules, permissions } = require("../config/config");
const { checkUserPermission } = require("../handler/session-handler");

const router = new express.Router();

//Base URL: /api/v1/custom/store

/**
 * Routes for Store
 **/
// Create a new Store
router.post("/", checkUserPermission(portalModules.STORE_SETUP, permissions.CREATE), store.create);

// Retrieve all Store
router.get("/", checkUserPermission(portalModules.STORE_SETUP, permissions.READ), store.findAll);

// Retrieve a single Store with id
router.get("/:id", checkUserPermission(portalModules.STORE_SETUP, permissions.READ), store.findOne);

// Update a Store with id
router.put("/:id", checkUserPermission(portalModules.STORE_SETUP, permissions.WRITE), store.update);

// Delete a Store with id
router.delete(
  "/:id",
  checkUserPermission(portalModules.STORE_SETUP, permissions.CANCEL),
  store.delete,
);

/**
 * Routes for Warehouses under Store
 **/
router.post(
  `/:${parentPrimaryKey}/warehouse/`,
  checkUserPermission(portalModules.STORE_WAREHOUSE, permissions.CREATE),
  storeWarehouses.create,
);

//Get All StoreWarehouses under a Store
//Sale Persons should be able to access Store WHs as well
router.get(
  `/:${parentPrimaryKey}/warehouse/`,
  checkUserPermission([portalModules.STORE_WAREHOUSE, portalModules.INVOICE], permissions.READ),
  storeWarehouses.findAll,
);

//Get StoreWarehouses based on 'filter' params passed
router.get(
  `/warehouse/find`,
  checkUserPermission(portalModules.STORE_WAREHOUSE, permissions.READ),
  storeWarehouses.findAll,
);

//Get ONE StoreWarehouses based on PK
router.get(
  "/warehouse/:id",
  checkUserPermission(portalModules.STORE_WAREHOUSE, permissions.READ),
  storeWarehouses.findOne,
);

//Update ONE StoreWarehouses based on PK
router.put(
  "/warehouse/:id",
  checkUserPermission(portalModules.STORE_WAREHOUSE, permissions.WRITE),
  storeWarehouses.update,
);

//Delete ONE StoreWarehouses based on PK
router.delete(
  "/warehouse/:id",
  checkUserPermission(portalModules.STORE_WAREHOUSE, permissions.CANCEL),
  storeWarehouses.delete,
);

//Delete ALL StoreWarehouses under a Store
// router.delete(`/:${parentPrimaryKey}/warehouse`, storeWarehouses.deleteAll);

/**
 * Routes for Counters under Store
 **/
router.post(
  `/:${parentPrimaryKey}/counter/`,
  checkUserPermission(portalModules.STORE_COUNTER, permissions.CREATE),
  storeCounters.create,
);

//Get All StoreCounters under a Store
router.get(
  `/:${parentPrimaryKey}/counter/`,
  checkUserPermission(portalModules.STORE_COUNTER, permissions.READ),
  storeCounters.findAll,
);

//Get StoreCounters based on 'filter' params passed
router.get(
  `/counter/find`,
  checkUserPermission(portalModules.STORE_COUNTER, permissions.READ),
  storeCounters.findAll,
);

//Get ONE StoreCounters based on PK
router.get(
  "/counter/:id",
  checkUserPermission(portalModules.STORE_COUNTER, permissions.READ),
  storeCounters.findOne,
);

//Update ONE StoreCounters based on PK
router.put(
  "/counter/:id",
  checkUserPermission(portalModules.STORE_COUNTER, permissions.WRITE),
  storeCounters.update,
);

//Delete ONE StoreCounters based on PK
router.delete(
  "/counter/:id",
  checkUserPermission(portalModules.STORE_COUNTER, permissions.CANCEL),
  storeCounters.delete,
);

/**
 * Routes for Users under Store
 **/
router.post(
  `/:${parentPrimaryKey}/user/`,
  checkUserPermission(portalModules.STORE_USER, permissions.CREATE),
  storeUsers.create,
);

//Get All StoreUsers under a Store
router.get(
  `/:${parentPrimaryKey}/user/`,
  checkUserPermission(portalModules.STORE_USER, permissions.READ),
  storeUsers.findAll,
);

//Get StoreUsers based on 'filter' params passed
router.get(
  `/user/find`,
  checkUserPermission(portalModules.STORE_USER, permissions.READ),
  storeUsers.findAll,
);

//Get ONE StoreUsers based on PK
router.get(
  "/user/:id",
  checkUserPermission(portalModules.STORE_USER, permissions.READ),
  storeUsers.findOne,
);

//Update ONE StoreUsers based on PK
router.put(
  "/user/:id",
  checkUserPermission(portalModules.STORE_USER, permissions.WRITE),
  storeUsers.update,
);

//Delete ONE StoreUsers based on PK
router.delete(
  "/user/:id",
  checkUserPermission(portalModules.STORE_USER, permissions.CANCEL),
  storeUsers.delete,
);

module.exports = router;
