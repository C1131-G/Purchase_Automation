//custom-api.9 zz w pulling Sr Item.js
const dbHelper = require("../helper/db");
const query = require("../config/hana-db");
const querySTR = require("../config/query-stock-transfer-request");
const queryST = require("../config/query-stock-transfer");
const { getApprovedSTRRecords } = require("./custom-stock-transfer-request");
const { getApprovedSTRecords } = require("./custom-stock-transfers");
const {
  getBatchSerialInfo,
  getItems,
  getTimYardItemRecords,
  getTimYardItemInitial1Records,
  getTimYardItemInitial2Records,
  getTimYardItemInitial3Records,
} = require("../helper/items");
const { portalModules, draftObjectCodes, draftStatus, itemTypes } = require("../config/config");

/**
 * Get DocEntry for a given DocNum (used to generated Crystal Report)
 */
const getDocEntry = (req, res) => {
  // if(req.session.userId) {
  //   where = ` AND T0."INTERNAL_K" = ?`;
  //   filter = [req.session.userId];
  // }
  let sql;
  if (req.query.moduleName === portalModules.STOCK_TRANSFER) {
    sql = queryST.selectSTDocEntry;
  }

  try {
    const result = dbHelper.executeWithValues(sql, [req.query.docNum]);
    console.log("getDocEntry: " + JSON.stringify(result));

    res.send(result);
  } catch (err) {
    console.log("getDocEntry - controller - error: " + JSON.stringify(err.message));
    res.status(500).send({ message: err.message });
  }
};

/**
 * Gets the Server's Date/Time. This will be used for GRPO creation
 * @param {*} req
 * @param {*} res
 */
const getServerDateTime = (req, res) => {
  try {
    res.send({ serverDateTime: new Date() });
  } catch (err) {
    console.log("err: " + JSON.stringify(err));
    res.status(500).send({ message: JSON.stringify(err) });
  }
};

/**
 * Get the list of Branches
 */
const getUserBranches = (req, res) => {
  // if(req.session.userId) {
  //   where = ` AND T0."INTERNAL_K" = ?`;
  //   filter = [req.session.userId];
  // }

  try {
    //Get all Freight Names & their code
    const branchList = dbHelper.executeWithValues(query.userBranches, [req.session.userId]);
    console.log("getUserBranches- branchList: " + JSON.stringify(branchList));

    res.send(branchList);
  } catch (err) {
    console.log("getItemDetails - controller - error: " + JSON.stringify(err.message));
    res.status(500).send({ message: err.message });
  }
};

/**
 * Get the list of All Freights
 */
const getFreightList = (req, res) => {
  try {
    //Get all Freight Names & their code
    const allFreightInfo = dbHelper.executeWithValues(query.allFreightInfo, []);
    console.log("getFreightList- allFreightInfo: " + JSON.stringify(allFreightInfo));

    res.send(allFreightInfo);
  } catch (err) {
    console.log("getItemDetails - controller - error: " + JSON.stringify(err.message));
    res.status(500).send({ message: err.message });
  }
};

/**
 * Get the list of Items to load the dropdown in Stock Transfer Req. Details tab in the portal
 */
const getItemsList = (req, res) => {
  console.log("*** req.query: " + JSON.stringify(req.query));

  try {
    const rows = getItems(req.query);
    //Send the array of ItemCodes alone ["SPLW0064", ..] for NORMAL items instead of sending Array of
    //objs. [{"ItemCode":"SPLW0064"}, ..]
    //This is to minimize the response size, bocz the size of the response was around 116kb when
    //sending Obj. array. It got reduced to 52.5kb when sending array of String WO "ItemCode"
    // if(req.query
    //  && (req.query.itemType === itemTypes.NORMAL || req.query.itemType === itemTypes.LABOR)) {
    //   rows.forEach(row => {
    //     itemCodes.push(row.ItemCode);
    //   });
    //   console.log("getItemsList - itemCodes - %s", JSON.stringify(itemCodes));
    //   res.send(itemCodes);
    // }
    // else {
    //   console.log("getItemsList - rows - %s", JSON.stringify(rows));
    //   res.send(rows);
    // }
    res.send(rows);
  } catch (err) {
    console.log("getItemsList - controller - error: " + JSON.stringify(err));
    res.status(500).send({ error: err.message });
  }
};

/**
 * Get Portal Modules list
 */
const getPortalModules = (req, res) => {
  try {
    dbHelper.executeQuery(query.portalModules, (err, rows) => {
      if (err) throw err;
      console.log("getPortalModules %s", JSON.stringify(rows));
      res.send(rows);
    });
  } catch (err) {
    console.log("getPortalModules - controller - error: " + JSON.stringify(err));
    res.status(500).send({ error: err });
  }
};

/**
 * Get the record count to check if the User is an Originator or Approver. If the count is > 0, Dashboard
 *  & Request will show the records that are submitted by the Originator/ submitted to the Approver resp.
 */
const getDraftsCount = (req, res) => {
  let objectType;
  // isApprover = false, isOriginator = false;
  let approverPending = 0,
    approverApproved = 0,
    approverRejected = 0;
  let originatorPending = 0,
    originatorApproved = 0,
    originatorRejected = 0;
  let sql, autoApprovedRecs;
  const { userId } = req.session;
  console.log("getDraftsCount - req.session.userId: ", userId);
  let filter = [userId];

  if (req.query.moduleName) {
    if (req.query.moduleName == portalModules.STOCK_TRANSFER_REQUEST) {
      objectType = draftObjectCodes.STOCK_TRANSFER_REQUEST;

      // sql = querySTR.selectApprovedSTR + ` AND T0."U_DraftStatus" = 'AUTO_APPROVED' AND T0."U_OriginatorId" = ?`;

      //Adding AUTO_APPROVED recs. to the `count`
      const autoApprovedRecords = getApprovedSTRRecords(
        ` AND T0."U_DraftStatus" = 'AUTO_APPROVED' AND T0."U_OriginatorId" = ?`,
        [userId],
      );
      if (Array.isArray(autoApprovedRecords) && autoApprovedRecords.length > 0) {
        approverApproved = approverApproved + autoApprovedRecords.length;
        originatorApproved = originatorApproved + autoApprovedRecords.length;
      }
    } else if (req.query.moduleName == portalModules.STOCK_TRANSFER) {
      objectType = draftObjectCodes.STOCK_TRANSFER;
      // sql = queryST.selectApprovedSTs + ` AND T0."U_OriginatorId" = ?`;

      //Adding AUTO_APPROVED recs. to the `count`
      const autoApprovedRecords = getApprovedSTRecords(
        ` AND T0."U_DraftStatus" = 'AUTO_APPROVED' AND T0."U_OriginatorId" = ?`,
        [userId],
      );
      if (Array.isArray(autoApprovedRecords) && autoApprovedRecords.length > 0) {
        approverApproved = approverApproved + autoApprovedRecords.length;
        originatorApproved = originatorApproved + autoApprovedRecords.length;
      }
    } else if (req.query.moduleName == portalModules.DELIVERY) {
      objectType = draftObjectCodes[portalModules.DELIVERY];
      sql = queryST.selectApprovedSTs + ` AND T0."U_OriginatorId" = ?`;
    }

    //This is for modules whose Drafts are saVed in ODRF table
    if (objectType) {
      filter.push(objectType);
    }

    try {
      /* Below two query results DOESN't seem to be used anywhere in the front-end
      const approver = dbHelper.executeWithValues(query.selectApproverCount, [userId, req.query.moduleName]);
      const originator = dbHelper.executeWithValues(query.selectOriginatorCount, [userId, req.query.moduleName]);
      */
      // console.log("approver: "+ JSON.stringify(approver));
      // console.log("originator: "+ JSON.stringify(originator));

      const draftsForApprover = dbHelper.executeWithValues(query.selectDraftsForApprover, filter); //[userId, objectType]
      const draftsForOriginator = dbHelper.executeWithValues(
        query.selectDraftsForOriginator,
        filter,
      ); //[userId, objectType]
      // console.log("draftsForApprover: "+ JSON.stringify(draftsForApprover));
      // console.log("draftsForOriginator: "+ JSON.stringify(draftsForOriginator));

      if (Array.isArray(draftsForApprover) && draftsForApprover.length) {
        draftsForApprover.forEach((draft) => {
          //Add the PENDING record to the count only if the Draft's Actual status is not APPROVED
          //ie., in a 'NON Multi-level' Approval setup, when there are '5' Approvers are added for an
          //Originator & if No. of Approvals required is '2'. In this case even if the Draft receives
          //'2' Approvals the status of the remaining '3' Approvers will remain PENDING which will showup
          //in the Dashboard. Added below additional cond. to remove the APPROVED Drafts
          //if(draft.U_DraftStatus === draftStatus.PENDING)

          if (
            draft.U_DraftStatus === draftStatus.PENDING &&
            draft.ActualStatus !== draftStatus.APPROVED
          )
            approverPending++;
          else if (draft.U_DraftStatus === draftStatus.APPROVED) approverApproved++;
          else if (draft.U_DraftStatus === draftStatus.REJECTED) approverRejected++;
        });
      }

      if (Array.isArray(draftsForOriginator) && draftsForOriginator.length) {
        draftsForOriginator.forEach((draft) => {
          if (draft.U_DraftStatus === draftStatus.PENDING) originatorPending++;
          else if (draft.U_DraftStatus === draftStatus.APPROVED) originatorApproved++;
          else if (draft.U_DraftStatus === draftStatus.REJECTED) originatorRejected++;
        });
      }

      //Below two flags (isApprover, isOriginator) DOESN't seem to be used anywhere in the front-end
      /*if ((approver && approver[0].Count > 0)
      || approverPending > 0 || approverApproved > 0 || approverRejected > 0 )
        isApprover = true;
      if ((originator && originator[0].Count > 0)
      || originatorPending > 0 || originatorApproved > 0 || originatorRejected > 0 )
        isOriginator = true;
      */

      // console.log(`isApprover ${isApprover}, isOriginator ${isOriginator}, approverPending ${approverPending},
      // approverApproved ${approverApproved}, approverRejected ${approverRejected}, originatorPending ${originatorPending},
      // originatorApproved ${originatorApproved}, originatorRejected ${originatorRejected}`);

      //isApprover, isOriginator,
      res.send({
        approverPending,
        approverApproved,
        approverRejected,
        originatorPending,
        originatorApproved,
        originatorRejected,
      });
    } catch (err) {
      res.status(500).send({ message: err.message });
    }
  } else {
    res.send({
      approverPending,
      approverApproved,
      approverRejected,
      originatorPending,
      originatorApproved,
      originatorRejected,
    });
  }
};

/**
 * Get the Available Quanity for given items present in the 'portal' Warehouses
 */
const getItemCountInWarehouse = (req, res) => {
  let itemCodes = req.query.itemCode;

  //enclose the values within single quotes
  if (Array.isArray(itemCodes)) {
    itemCodes = "'" + itemCodes.join("','") + "'";
  } else {
    itemCodes = "'" + itemCodes + "'";
  }
  console.log("** itemCodes: " + itemCodes);

  let sql = query.itemQuantityInWarehouse;
  let condition = [],
    result = [];
  if (req.query.itemCode) {
    condition.push(`T0."ItemCode" IN (${itemCodes})`);
  }
  if (req.query.warehouseCode) {
    condition.push(`T0."WhsCode" IN (${req.query.warehouseCode})`);
  }
  if (condition.length) {
    // sql = sql + " WHERE " + condition.join(" AND "); //commenting this as I added WHERE to filter Portal WHs
    //sql = sql + " AND " + condition.join(" AND ");
    sql = `${sql} AND ${condition.join(" AND ")} ORDER BY T0."OnHand" DESC`;
  }
  console.log("getItemCountInWarehouse - sql: " + sql);

  try {
    // result = dbHelper.executeWithValues(query.itemQuantityInWarehouse,
    //   [req.query.itemCode, req.query.warehouseCode]);
    result = dbHelper.executeWithValues(sql);

    console.log("getItemCountInWarehouse - result: " + JSON.stringify(result));
    // if(Array.isArray(result) && result.length)
    //   availableQuantity = result[0].OnHand;
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Get the Available Quanity for given items present in the 'portal' Warehouses
 */
const getBinsAndItemQtyForWarehouse = (req, res) => {
  console.log("req.query: " + JSON.stringify(req.query));
  console.log("req.params: " + JSON.stringify(req.params));

  let limitOffset = "",
    values = [],
    filter = "",
    orderBy = "";
  if (req.query.searchKey) {
    filter = ` AND (
                UPPER(A."ItemCode") LIKE '%${req.query.searchKey}%'
                  OR UPPER(A."ItemName") LIKE '%${req.query.searchKey}%'
                  OR UPPER(A."FrgnName") LIKE '%${req.query.searchKey}%' ) `;
  }

  let sql;
  let itemCode = req.query.itemCode;
  let warehouseCode = req.query.warehouseCode;
  let binCode = req.query.binCode; //Added for BinToBin Transfer
  let barCode = req.query.barCode;
  let cardCode = req.query.cardCode;
  let branch = req.query.branch;

  if (req.params.type === "available-item-qty") {
    sql = query.binsAndItemQuantityInWarehouse;

    console.log("Store Location: ", req.session?.userSessionLog?.storeLocation);
    // Use Price List `2` (POS Labasa List) for Labasa based Stores
    if (req.session?.userSessionLog?.storeLocation === "Labasa") {
      values.push("2");
    }
    // Use Price List `1` for the stores at the reset of the locations
    else {
      values.push("1");
    }

    let condition = [];
    if (itemCode) {
      condition.push(`A."ItemCode" IN ('${itemCode}')`);
    }
    if (barCode) {
      condition.push(`A."CodeBars" IN ('${barCode}')`);
    }
    if (warehouseCode) {
      condition.push(`C."WhsCode" IN ('${warehouseCode}')`);
    }
    if (binCode) {
      condition.push(`D."BinCode" IN ('${binCode}')`);
    }
    if (condition.length) {
      sql = `${sql} AND ${condition.join(" AND ")}`;
    }
    orderBy = ` ORDER BY D."BinCode" ASC`;
    sql = sql + filter + orderBy + limitOffset;
    console.log("getBinsAndItemQtyForWarehouse - sql: " + sql);
  } else if (req.params.type === "available-item-qty-price") {
    sql = query.binsAndItemQuantityInWarehouseWithPrice;

    console.log("Store Location: ", req.session?.userSessionLog?.storeLocation);
    // Use Price List `2` (POS Labasa List) for Labasa based Stores
    // if(req.session?.userSessionLog?.storeLocation === "Labasa") {
    //   values.push("2");
    // }
    // // Use Price List `1` for the stores at the reset of the locations
    // else {
    //   values.push("1");
    // }
    values.push(cardCode);

    let condition = [];
    if (itemCode) {
      condition.push(`A."ItemCode" IN ('${itemCode}')`);
    }
    if (barCode) {
      condition.push(`F."BcdCode" IN ('${barCode}')`);
    }
    if (warehouseCode) {
      condition.push(`B."WhsCode" IN ('${warehouseCode}')`);
    }
    if (binCode) {
      condition.push(`D."BinCode" IN ('${binCode}')`);
    }
    if (condition.length) {
      sql = `${sql} AND ${condition.join(" AND ")}`;
    }
    orderBy = ` ORDER BY D."BinCode" ASC`;
    sql = sql + filter + orderBy + limitOffset;
    console.log("getBinsAndItemQtyForWarehouse - sql: " + sql);
  } else if (req.params.type === "available-item-qty-price-with-pricelist") {
    sql = query.binsAndItemQuantityInWarehouseWithPriceList;

    console.log("Store Location: ", req.session?.userSessionLog?.storeLocation);
    values.push(cardCode);
    values.push(branch);

    let condition = [];
    if (itemCode) {
      condition.push(`A."ItemCode" IN ('${itemCode}')`);
    }
    if (barCode) {
      condition.push(`F."BcdCode" IN ('${barCode}')`);
    }
    if (warehouseCode) {
      condition.push(`B."WhsCode" IN ('${warehouseCode}')`);
    }
    if (binCode) {
      condition.push(`D."BinCode" IN ('${binCode}')`);
    }
    if (condition.length) {
      sql = `${sql} AND ${condition.join(" AND ")}`;
    }
    orderBy = ` ORDER BY D."BinCode" ASC`;
    sql = sql + filter + orderBy + limitOffset;
    console.log("getBinsAndItemQtyForWarehouse - sql: " + sql);
  } else {
    //TODO: Add the query to pull ALL Bin Locations list if the "type" is not passed
    sql = query.binsList;
    let condition = [];
    if (warehouseCode) {
      condition.push(`T0."WhsCode" IN ('${warehouseCode}')`);
    }
    if (condition.length) {
      sql = `${sql} WHERE ${condition.join(" AND ")} ORDER BY T0."BinCode" ASC`;
    }
  }

  if (req.query.pageNum && req.query.pageSize) {
    const page = req.query.pageNum;
    const pageSize = req.query.pageSize;
    const startIndex = (page - 1) * pageSize;
    const endIndex = page * pageSize;
    limitOffset = ` LIMIT ? OFFSET ? `;
    values = [pageSize, startIndex];
  }

  try {
    const result = dbHelper.executeWithValues(sql, values);
    // console.log("getBinsAndItemQtyForWarehouse - result: "+ JSON.stringify(result));
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const getBatchSerialNoInfo = async (req, res) => {
  try {
    const result = await getBatchSerialInfo(req.query);
    // console.log("getBatchSerialNoInfo: "+ JSON.stringify(result));
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// const getTimYardItemInfo = async (req, res) => {
//   try {
//     console.log("getTimYardItemInfo: ", req.query);
//     let result = [];
//     if (req.query.isStockCounter === 'true') {
//       result = await getTimYardItemInitial1Records(req.query);
//       if(Array.isArray(result) && result.length === 0){
//         result = await getTimYardItemInitial2Records(req.query);
//       }
//     } else {
//       result = await getTimYardItemRecords(req.query);
//     }
//     console.log("getTimYardItemInfo: "+ JSON.stringify(result));
//     res.send(result);
//   }
//   catch (err) {
//     res.status(500).send({ message: err.message });
//   }
// }

const getTimYardItemInfo = async (req, res) => {
  try {
    console.log("getTimYardItemInfo: ", req.query);
    let result = [];
    if (req.query.isStockCounter === "true") {
      result = await getTimYardItemInitial3Records(req.query);
    } else {
      result = await getTimYardItemRecords(req.query);
    }
    console.log("getTimYardItemInfo: " + JSON.stringify(result));
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const getBinListbyItem = async (req, res) => {
  console.log("req.query" + JSON.stringify(req.query));
  try {
    const rows = dbHelper.executeWithValues(query.binsListForItem, [
      req.query.warehouseCode,
      req.query.itemCode,
    ]);
    res.send(rows);
  } catch (err) {
    console.log("getBins - error: " + JSON.stringify(err.message));
    next(err);
  }
};

module.exports = {
  getDocEntry,
  getServerDateTime,
  getUserBranches,
  getFreightList,
  getItemsList,
  getPortalModules,
  getDraftsCount,
  getItemCountInWarehouse,
  getBinsAndItemQtyForWarehouse,
  getBatchSerialNoInfo,
  getTimYardItemInfo,
  getBinListbyItem,
};
