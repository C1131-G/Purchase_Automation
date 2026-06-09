const dbHelper = require("../helper/db.js");
const query = require("../config/query-item-master.js");

/**
 * Get the list of all Items
 */
exports.getItems = (req) => {
  try {
    let limitOffset = "",
      values = [],
      filter = "",
      orderBy = "";
    if (req?.pageNum && req?.pageSize) {
      const page = req.pageNum;
      const pageSize = req.pageSize;
      const startIndex = (page - 1) * pageSize;
      const endIndex = page * pageSize;
      limitOffset = ` LIMIT ? OFFSET ? `;
      values = [pageSize, startIndex];
    }

    if (req?.searchKey) {
      let { searchKey } = req;
      if (isNaN(searchKey)) {
        searchKey = searchKey.toUpperCase();
      }

      filter = ` AND (
                  UPPER(T0."ItemCode") LIKE '%${searchKey}%'
                    OR UPPER(T0."ItemName") LIKE '%${searchKey}%'
                    OR UPPER(T0."FrgnName") LIKE '%${searchKey}%' ) `;
    }

    const sql = query.items + filter + orderBy + limitOffset;
    const result = dbHelper.executeWithValues(sql, values);
    // console.log("getItems- result: "+JSON.stringify(result));
    return result;
  } catch (err) {
    console.log("getItems - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};

/**
 * Get the list of Item Groups
 */
exports.getItemGroups = () => {
  try {
    const result = dbHelper.executeWithValues(query.itemGroups, []);
    // console.log("getItemGroups-: "+JSON.stringify(result));
    return result;
  } catch (err) {
    console.log("getItemGroups - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};

/**
 * Get the list of Item Sub-Groups
 */
exports.getItemSubGroups = (subGroupId) => {
  try {
    const result = dbHelper.executeWithValues(query.itemSubGroups, [subGroupId]);
    // console.log("getItemSubGroups-: "+JSON.stringify(result));
    return result;
  } catch (err) {
    console.log("getItemSubGroups - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};

/**
 * Get the current Max Sequence No. The next no. in this sequence will be assigned to the Item that's
 * created next
 */
exports.getMaxSequenceNo = () => {
  try {
    const result = dbHelper.executeWithValues(query.itemMaxSequenceNo, []);
    console.log("getItemGroups-: " + JSON.stringify(result));
    if (Array.isArray(result) && result.length > 0) {
      return result[0].MaxNo; // ? result[0].MaxNo : 0
    }
    return 0;
  } catch (err) {
    console.log("getMaxSequenceNo - controller - error: " + JSON.stringify(err.message));
    throw err;
  }
};
