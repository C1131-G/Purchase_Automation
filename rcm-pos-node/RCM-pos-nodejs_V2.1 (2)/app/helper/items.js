const query = require("../config/hana-db.js");
const batchSerialQuery = require("../config/query-batch-serial.js");
const timYardQuery = require("../config/query-tim-yard-items.js");
const dbHelper = require("../helper/db.js");
const { buildLimitOffset, buildWildCardSearchCondition } = require("../utils/query.util.js");
const { itemTypes, requestTypes, EXCLUDED_ITEM_GROUPS } = require("../config/config.js");

/**
 * Get the list of Items to load the dropdown in Stock Transfer Req. Details tab in the portal
 */
const getItems = (req) => {
  console.log("*** req.query: " + JSON.stringify(req.query));

  let limitOffset = "",
    values = [],
    filter = "",
    orderBy = "";
  if (req.pageNum && req.pageSize) {
    limitOffset = buildLimitOffset(req.pageNum, req.pageSize);
  }

  if (req.searchKey) {
    filter = buildWildCardSearchCondition(
      ['T0."ItemCode"', 'T0."ItemName"', 'T0."FrgnName"'],
      req.searchKey,
    );
  }

  //NOTE: for NORMAL items I only need ItemCode, whereas for other Items need ItemName & UOM too, so
  //add teh sqls here itself instead of dynamically adding WHERE cond.
  //Get all the Items

  //NOTE: Batch Item: ManBtchNum = 'Y' | Serial Item: ManSerNum = 'Y' | Labor Item: InvntItem = 'N'
  //Normal Item: ManBtchNum = 'N' & ManSerNum = 'N'
  let sql = `SELECT T0."ItemCode", T0."ItemName", T0."FrgnName", T0."InvntryUom",
             T0."ManBtchNum", T0."ManSerNum", T0."InvntItem",
             T0."CodeBars", T0."AvgPrice", T0."SpcialDisc" "Discount",
             (SELECT MAX(A."Price") FROM  ${query.dbCreds.CompanyDB}.ITM1 A 
                WHERE A."ItemCode"=T0."ItemCode" AND A."PriceList"='1') AS "Price"
              FROM ${query.dbCreds.CompanyDB}.OITM T0
             WHERE T0."frozenFor" = 'N'`;
  //T0."ExitPrice" "Price",
  //WHERE T0."U_Neo_IsTransferable" ='Y'
  // AND T0."ItemCode" IN ('AAOT0002', 'AAOT0003')`; //Added this cond. to filter only 2 recs.
  //Loading all 6000+ recs. making it difficult to test due to slowness

  //Filter Normal Items alone - for STR Details screen
  if (req.itemType) {
    let itemCodes = "",
      itemFilter = "";

    //This param will not be set for requests from INv. Couting screen, where ALL non-Batch/Serial
    //items must be pulled
    if (req.itemCodes) {
      itemCodes = req.itemCodes;

      //enclose the values within single quotes
      if (Array.isArray(itemCodes)) {
        itemCodes = "'" + itemCodes.join("','") + "'";
      } else {
        itemCodes = "'" + itemCodes + "'";
      }
      itemFilter = ` AND T0."ItemCode" IN (${itemCodes})`;
    }

    console.log("** itemCodes: " + itemCodes);

    if (req.itemType === itemTypes.NORMAL) {
      sql = `SELECT T0."ItemCode"
              FROM ${query.dbCreds.CompanyDB}.OITM T0
            WHERE T0."ManBtchNum" ='N' AND T0."ManSerNum" ='N' AND T0."frozenFor" = 'N'
              ${itemFilter}`;
      // AND T0."U_Neo_IsTransferable" ='Y'
      //AND T0."ItemCode" IN (${itemCodes})
    } else if (req.itemType === itemTypes.LABOR) {
      sql = `SELECT T0."ItemCode"
              FROM ${query.dbCreds.CompanyDB}.OITM T0
            WHERE T0."InvntItem" ='N' AND T0."frozenFor" = 'N'
              ${itemFilter}`;
      //AND T0."ItemCode" IN (${itemCodes})
    }
  }
  orderBy = ` ORDER BY T0."ItemCode" ASC`;

  try {
    console.log(
      "getItems - sql+filter+orderBy+limitOffset: ",
      sql + filter + orderBy + limitOffset,
    );
    console.log("getItems - values: ", values);

    let rows = dbHelper.executeWithValues(sql + filter + orderBy + limitOffset, values); //query.itemsList + filter
    let itemCodes = [];

    //Send the array of ItemCodes alone ["SPLW0064", ..] for NORMAL items instead of sending Array of
    //objs. [{"ItemCode":"SPLW0064"}, ..]
    //This is to minimize the response size, bocz the size of the response was around 116kb when
    //sending Obj. array. It got reduced to 52.5kb when sending array of String WO "ItemCode"
    if (req.query && (req.itemType === itemTypes.NORMAL || req.itemType === itemTypes.LABOR)) {
      rows.forEach((row) => {
        itemCodes.push(row.ItemCode);
      });
      console.log("getItems - itemCodes - %s", JSON.stringify(itemCodes));
      return itemCodes;
    } else {
      console.log("getItems - rows - %s", JSON.stringify(rows));
      return rows;
    }
  } catch (err) {
    console.log("getItems - helper - error: " + JSON.stringify(err));
    throw err;
  }
};

/**
 * Gets the Batch/Serial records based on the `filters` passed
 * @param {*} filter
 * @returns
 */
//NOTE: For the time being I created the below func.
//TODO: Need to give this func. a better name
const getBatchSerialInfo = async (filter) => {
  let sql,
    values = [],
    where = "";
  console.log("filter.itemAndWHCodes: " + filter.itemAndWHCodes);

  if (filter.type === requestTypes.BATCH_SERIAL_IN_A_BIN) {
    try {
      const result = await getBatchSerialRecords(
        filter.itemType,
        filter.itemCode,
        filter.warehouseCode,
        filter.binCode,
      );
      console.log("getBatchSerialInfo: " + JSON.stringify(result));
      return result;
    } catch (err) {
      throw err;
    }
  } else if (filter.type === requestTypes.BATCH_SERIAL_WITH_ALL_BINS) {
    try {
      // const itemAndWHCodes = filter.itemAndWHCodes; //JSON.parse(filter.itemAndWHCodes);

      let batchList, serialList; //, itemWHCodes=[];
      let binsListForBatch = [],
        binsListForSerial = [];
      // sql = query.batchForItemAndWH;

      /*if(Array.isArray(itemAndWHCodes) && itemAndWHCodes.length) {
        itemAndWHCodes.forEach(item => {
          item = JSON.parse(item);

          //Adding the ItemCode-WHCode pair twice for two SELECT stmts in the same query
          // itemWHCodes.push(item.itemCode);
          // itemWHCodes.push(item.warehouseCode);
          // itemWHCodes.push(item.itemCode);
          // itemWHCodes.push(item.warehouseCode);

          //resulting 'values' Array: [[item1, WH1, item1, WH1], [item2, WH2, item2, WH2],...]
          values.push([item.itemCode, item.warehouseCode, item.itemCode, item.warehouseCode]);
        });
      }*/

      const filterParams = buildFilterParams(filter.itemAndWHCodes, "A");
      //Added GROUP BY to 'sum' OnHandQuantity of each Bin and show it under a Batch/Serial
      where =
        filterParams.where +
        ` GROUP BY A."ItemCode", C."BinCode", C."AbsEntry", A."WhsCode",B."DistNumber"`;
      values = filterParams.values;

      //Get the list of BatchSerial nos. with its Total OnHandQty for the given Item-WH combo
      console.log("BATCH_SERIAL_WITH_ALL_BINS - values: " + values.toString());
      batchList = dbHelper.executeWithValues(query.batchForItemAndWH + where, values);
      serialList = dbHelper.executeWithValues(query.serialForItemAndWH + where, values);
      // console.log("BATCH_SERIAL_WITH_ALL_BINS - result: "+ JSON.stringify(batchList));

      if (Array.isArray(batchList) && batchList.length > 0) {
        let filterParams2 = buildFilterParams(batchList, "A");
        where = filterParams2.where;
        values = filterParams2.values;

        //Get the list of BatchSerial nos. for the given Item-WH combo
        // console.log("binsListForBatch - values: "+ values.toString());
        binsListForBatch = dbHelper.executeWithValues(query.getAllBinsForBatch + where, values);
        // console.log("binsListForBatch - result: "+ JSON.stringify(binsListForBatch));
      }
      if (Array.isArray(serialList) && serialList.length > 0) {
        let filterParams3 = buildFilterParams(serialList, "A");
        where = filterParams3.where;
        values = filterParams3.values;

        //Get the list of BatchSerial nos. for the given Item-WH combo
        console.log("binsListForSerial - values: " + values.toString());
        binsListForSerial = dbHelper.executeWithValues(query.getAllBinsForSerial + where, values);
        console.log("binsListForSerial - result: " + JSON.stringify(binsListForSerial));
      }

      if (Array.isArray(binsListForBatch) && binsListForBatch.length > 0) {
        let binAllocation = [];
        batchList.forEach((batch) => {
          binsListForBatch.forEach((bin) => {
            if (
              batch.ItemCode === bin.ItemCode &&
              batch.WhsCode === bin.WhsCode &&
              batch.BatchNumberProperty === bin.BatchNumberProperty
            ) {
              binAllocation.push({
                BatchNumberProperty: bin.BatchNumberProperty,
                BinCode: bin.BinCode,
                BinAbsEntry: bin.BinAbsEntry,
                OnHandQty: bin.OnHandQty,
              });
            }
          });
          batch.DocumentLinesBinAllocations = binAllocation;
          binAllocation = [];
        });
      }

      //TODO: Need to move the below code to a fucnt. and use it for both Batch & Serial items
      if (Array.isArray(binsListForSerial) && binsListForSerial.length > 0) {
        let binAllocation = [];
        serialList.forEach((batch) => {
          binsListForSerial.forEach((bin) => {
            if (
              batch.ItemCode === bin.ItemCode &&
              batch.WhsCode === bin.WhsCode &&
              batch.InternalSerialNumber === bin.InternalSerialNumber
            ) {
              binAllocation.push({
                InternalSerialNumber: bin.InternalSerialNumber,
                BinCode: bin.BinCode,
                BinAbsEntry: bin.BinAbsEntry,
                OnHandQty: bin.OnHandQty,
              });
            }
          });
          batch.DocumentLinesBinAllocations = binAllocation;
          binAllocation = [];
        });
      }
      return [...batchList, ...serialList];
    } catch (err) {
      throw err;
    }
  } else {
    // sql = query.selectInfoFromBatchSerialNo;

    console.log("filter: " + filter);

    //Used in Inventory Count. screen
    if (filter.batchSerialNo && filter.binCode) {
      where = ` AND B."DistNumber" = ? AND C."BinCode" = ?`;
      values = [filter.batchSerialNo, filter.binCode];
    } else if (filter.batchSerialNo) {
      where = ` AND B."DistNumber" = ?`;
      values = [filter.batchSerialNo];
    }
    //Added for Print QR Code screen
    else if (filter.warehouseCode) {
      // else if(filter.warehouseCode) {
      where += ` AND A."WhsCode" = ?`;
      values = [filter.warehouseCode];

      if (filter.binCode) {
        where += ` AND C."BinCode" = ?`;
        values.push(filter.binCode);
      }
    }
    //for 'old' items that don't have QR Code, get all the items that match the ItemCode & WH Code in
    //the filter. Let the user select the Batch/Serial no. they want
    else if (filter.itemAndWHCodes) {
      // const itemAndWHCodes = filter.itemAndWHCodes;
      const filterParams = buildFilterParams(filter.itemAndWHCodes, "A");
      where = filterParams.where;
      values = filterParams.values;
    }
    // where = where + ` GROUP BY A."ItemCode", C."BinCode", C."AbsEntry", A."WhsCode",B."DistNumber"`;

    //Added to filter Batch/Serial recs. where same Batch/Serial# (created b4 NEO) is assigned to more than 1 ItemCode
    if (filter.itemCode) {
      where = ` AND A."ItemCode" = ?`;
      values = [filter.itemCode];
    }

    try {
      // console.log("*** getBatchSerialInfo - sql+where: "+ sql+where);
      console.log("getBatchSerialInfo - values: " + values.toString());
      // result = dbHelper.executeWithValues(sql + where, values);
      /*
      const batchList = dbHelper.executeWithValues(query.batchForItemAndWH + where, values);
      const serialList = dbHelper.executeWithValues(query.serialForItemAndWH + where, values);
      */

      const batchList = dbHelper.executeWithValues(query.getAllBinsForBatch + where, values);
      const serialList = dbHelper.executeWithValues(query.getAllBinsForSerial + where, values);

      //console.log("getBatchSerialInfo - batchList: "+ JSON.stringify(batchList));
      //console.log("getBatchSerialInfo - serialList: "+ JSON.stringify(serialList));
      return [...batchList, ...serialList];
    } catch (err) {
      throw err;
    }
  }
};

/**
 * Returns All Batch/Serial records for given Item, WH & Bin details
 * @param {*} itemType
 * @param {*} itemCode
 * @param {*} warehouseCode
 * @param {*} binCode
 * @returns
 */
const getBatchSerialRecords = (itemType, itemCode, warehouseCode, binCode) => {
  let condition = [],
    result,
    sql;
  if (itemType === itemTypes.BATCHES) {
    sql = query.getAllBinsForBatch;
  } else if (itemType === itemTypes.SERIAL_NUMBERS) {
    sql = query.getAllBinsForSerial;
  }

  if (itemCode) {
    condition.push(`A."ItemCode" IN ('${itemCode}')`);
  }
  if (warehouseCode) {
    condition.push(`A."WhsCode" IN ('${warehouseCode}')`);
  }
  if (binCode) {
    condition.push(`C."BinCode" IN ('${binCode}')`);
  }
  if (condition.length) {
    sql = `${sql} AND ${condition.join(" AND ")}`;
  }
  try {
    result = dbHelper.executeWithValues(sql);
    console.log("getBatchSerialRecords - result: " + JSON.stringify(result));
    return result;
  } catch (err) {
    throw err;
  }
};

/**
 * Sets/Reserves a Batch/Serial record to a given Customer
 * @param {*} batchNumber
 * @param {*} serialNumber
 * @param {*} itemReservedFor   Customer to which the Batch/Serial rec. will be reserved
 * @returns
 */
const setBatchSerialReservedCust = (batchNumber, serialNumber, itemReservedFor) => {
  let condition = [],
    result,
    sql;
  if (batchNumber) {
    sql = batchSerialQuery.updateReservedCustForBatch;
  } else if (serialNumber) {
    sql = batchSerialQuery.updateReservedCustForSerial;
  }

  try {
    result = dbHelper.executeWithValues(sql, itemReservedFor);
    console.log("setBatchSerialReservedCust - result: " + JSON.stringify(result));
    return result;
  } catch (err) {
    throw err;
  }
};

/**
 * Builds filters for WHERE clause in the below format based on the Items & WH passed
 * Sample Result:
 *    AND ((T0."ItemCode" = 'INLV1065' AND T0."WhsCode" = 'A')
      OR (T0."ItemCode" = 'INLV1066' AND T0."WhsCode" = 'B'))
  
 * @param {Object} itemAndWHCodes
 * @param {String} alias
*/
const buildFilterParams = (itemAndWHCodes, alias) => {
  let values = [],
    where = "";
  if (Array.isArray(itemAndWHCodes) && itemAndWHCodes.length) {
    itemAndWHCodes.forEach((item) => {
      if (!where) {
        where += " AND (";
      } else {
        where += " OR ";
      }
      //this was coming in as string, like this- '{itemCode: "INLV1065", warehouseCode: "A"}'
      //so the query result was []. Found this while debuging adn added the belw code to 'parse'

      //..parse() throws 'Unexpected Token error' when 'batchList' is passed to this method,
      //so added this comment to bypass the parsing
      if (!item.BatchNumberProperty && !item.InternalSerialNumber) item = JSON.parse(item);

      //This is for getting All Bin details for a given Batch/Serial#, Item & WH
      if (item.BatchNumberProperty || item.InternalSerialNumber) {
        where += `(B."DistNumber"=? AND ${alias}."ItemCode" = ? AND ${alias}."WhsCode" = ?)`;
        values.push(
          item.BatchNumberProperty ? item.BatchNumberProperty : item.InternalSerialNumber,
        );
        values.push(item.ItemCode);
        values.push(item.WhsCode);
      } else {
        where += `(${alias}."ItemCode" = ? AND ${alias}."WhsCode" = ?)`;
        values.push(item.itemCode);
        values.push(item.warehouseCode);
      }
    });
    /** add filter cond. to remove Batch/Sr. nos generated by NEO (with QR Codes). Samples below
     * Batch No.: "2004211-21/05/2020-0047256006"
     * Serial No.: "T/20/1590047258185"
     */
    //where += `) AND ${alias}."BatchNum" NOT LIKE '%\/%' AND ${alias}."IntrSerial" NOT LIKE 'T/%'`;
    //where += `) AND ${alias}."BatchNum" NOT LIKE '%NEO' AND ${alias}."IntrSerial" NOT LIKE '%NEO'`;

    //Add this ORDER BY clause only if the records pulled used in Issue Fr Prod.
    // if(!itemAndWHCodes[0].BatchSerialNo) {
    // where += `) ORDER BY ${alias}."InDate" ASC`;
    // }
    where += `)`;

    /** Sample query generated:
    SELECT T0."ItemCode", T0."WhsCode", T0."Quantity", T0."BatchNum", T0."IntrSerial", T0."InDate"
      FROM OIBT T0
    WHERE T0."Quantity" > 0 
    AND ((T0."ItemCode" = 'INLV1065' AND T0."WhsCode" = 'A')
      OR (T0."ItemCode" = 'INLV1066' AND T0."WhsCode" = 'B'))
    AND T0."BatchNum" NOT LIKE '%/%' 
    AND T0."IntrSerial" NOT LIKE 'T/%';
    */
  }
  return { where, values };
};

/**
 * Returns All Tim Yard records for given Item, WH details
 * @param {*} itemCode
 * @param {*} warehouseCode
 * @returns
 */
const getTimYardItemRecords = (query) => {
  let condition = [],
    result,
    sql;
  sql = timYardQuery.selectTimYardItemInfo;
  if (query.itemCode) {
    condition.push(`T0."ItemCode" IN ('${query.itemCode}')`);
  }
  if (query.warehouseCode) {
    condition.push(`T1."WhsCode" IN ('${query.warehouseCode}')`);
  }
  if (condition.length) {
    sql = `${sql} AND ${condition.join(" AND ")}`;
  }
  console.log("getTimYardItems - Query: " + sql);
  try {
    result = dbHelper.executeWithValues(sql);
    console.log("getTimYardItemRecords - result: " + JSON.stringify(result));
    return result;
  } catch (err) {
    throw err;
  }
};

const getTimYardItemInitial1Records = (query) => {
  let condition = [],
    result,
    sql;
  sql = timYardQuery.selectTimYardItemInitialInfo1;

  if (query.itemCode) {
    condition.push(`T0."ItemCode" IN ('${query.itemCode}')`);
  }
  if (condition.length) {
    sql = `${sql} AND ${condition.join(" AND ")}`;
  }

  console.log("getTimYardItemInitial1Records - Query: " + sql);

  try {
    result = dbHelper.executeWithValues(sql); // result will be an array of rows
    return result;
  } catch (err) {
    throw err;
  }
};

const getTimYardItemInitial2Records = (query) => {
  let condition = [],
    result,
    sql;
  sql = timYardQuery.selectTimYardItemInitialInfo2;

  if (query.itemCode) {
    condition.push(`T0."ItemCode" IN ('${query.itemCode}')`);
  }
  if (condition.length) {
    sql = `${sql} AND ${condition.join(" AND ")}`;
  }

  console.log("getTimYardItemInitialRecords - Query: " + sql);

  try {
    result = dbHelper.executeWithValues(sql); // result will be an array of rows
    // always enrich with U_Batch here
    const enriched = result.map((row) => {
      // last 6 digits from ItemCode
      const last6 = row.ItemCode.toString().slice(-6);

      // safely parse and convert U_Length to number
      let len = "";
      if (row.U_Length !== undefined && row.U_Length !== null) {
        len = parseFloat(row.U_Length); // gives 3 from "3.000000"
      }

      const U_Batch = len !== "" ? `SC${last6}_${len}` : `SC${last6}`;

      return {
        ...row,
        U_Batch,
      };

      // add U_Batch to every row
      // const enriched = result.map(row => {
      //   // take last 6 digits from ItemCode
      //   const last6 = row.ItemCode.toString().slice(-6);
      //   // generate U_Batch
      //   const U_Batch = `SC${last6}_${row.Length}`;
      //   return {
      //     ...row,
      //     U_Batch
      //   };
    });

    console.log("getTimYardItemInitialRecords - enriched: " + JSON.stringify(enriched));
    return enriched;
  } catch (err) {
    throw err;
  }
};

const getTimYardItemInitial3Records = (query) => {
  let condition = [],
    result,
    sql,
    sql1,
    sql2;
  sql = timYardQuery.selectTimyardItemInitialInfo3;

  if (query.itemCode) {
    condition.push(`T0."ItemCode" IN ('${query.itemCode}')`);
  }
  if (query.warehouseCode) {
    condition.push(`T1."WhsCode" IN ('${query.warehouseCode}')`);
  }
  if (condition.length) {
    sql = `${sql} AND ${condition.join(" AND ")}`;
  }

  sql1 = timYardQuery.selectTimyardItemInitialInfo4;
  condition = [];
  if (query.itemCode) {
    condition.push(`T0."ItemCode" IN ('${query.itemCode}')`);
  }
  if (condition.length) {
    sql1 = `${sql1} AND ${condition.join(" AND ")}`;
  }

  sql2 = timYardQuery.selectTimYardItemExistsCheck;
  condition = [];
  if (query.itemCode) {
    condition.push(`S0."ItemCode" IN ('${query.itemCode}')`);
  }
  if (query.warehouseCode) {
    condition.push(`S1."WhsCode" IN ('${query.warehouseCode}')`);
  }
  if (condition.length) {
    sql2 = `${sql2} AND ${condition.join(" AND ")}`;
  }

  sql = sql + " UNION " + sql1 + " AND NOT EXISTS (" + sql2 + " )";

  console.log("getTimYardItemInitialRecords - Query: " + sql);

  try {
    result = dbHelper.executeWithValues(sql); // result will be an array of rows
    // always enrich with U_Batch here
    const enriched = result.map((row) => {
      // If batch already exists, keep it
      if (row.U_Batch && row.U_Batch.trim() !== "") {
        return row;
      }
      // last 6 digits from ItemCode
      const last6 = row.ItemCode.toString().slice(-6);

      // safely parse and convert U_Length to number
      let len = "";
      if (row.U_Length !== undefined && row.U_Length !== null) {
        len = parseFloat(row.U_Length); // gives 3 from "3.000000"
      }

      const U_Batch =
        len !== "" ? `SC${query.warehouseCode}${last6}_${len}` : `SC${query.warehouseCode}${last6}`;

      return {
        ...row,
        U_Batch,
      };
    });

    console.log("getTimYardItemInitialRecords - enriched: " + JSON.stringify(enriched));
    return enriched;
  } catch (err) {
    throw err;
  }
};

module.exports = {
  getItems,
  getBatchSerialInfo,
  getBatchSerialRecords,
  setBatchSerialReservedCust,
  getTimYardItemRecords,
  getTimYardItemInitial1Records,
  getTimYardItemInitial3Records,
};
