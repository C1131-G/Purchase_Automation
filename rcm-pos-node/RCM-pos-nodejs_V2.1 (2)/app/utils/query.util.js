const { isValidDate } = require("./utils.js");

const defaultRecCount = 50;

/**
 * Build the entire sql with filter conds. & LIMIT, OFFSET & ORDER BY
 * @param {String} query Header Query for the particular module
 * @param {Object} req   Request from the Frontend
 * @param {Array}  additionalFields Array of additional fields that need to added to the `lookupFields`.
 *                                 NOTE: Alias name is mandatory for the fields
 * @param {String} dateField Some modules like Inv. Counting has `CountDate` as Date field
 */
exports.buildHeaderRecQuery = (query, req, additionalFields = null, dateField = "DocDate") => {
  let filter = "",
    limitOffset = "";

  const headerConditions = this.buildHeaderRecFilterConditions(req, dateField);
  filter += headerConditions.filter; //rvin

  if (req.searchKey) {
    //Commented to avoid potential performance issue. Can add later if required
    // `T0."CardName"`
    const lookupFields = [
      `T0."DocNum"`,
      `T0."NumAtCard"`,
      `T0."Comments"`,
      `T0."CardName"`,
      `T1."ItemCode"`,
      `T1."Dscription"`,
    ];

    if (additionalFields) {
      lookupFields.push(...additionalFields);
    }

    filter += this.buildWildCardSearchCondition(lookupFields, req.searchKey);

    // Return first 50 records when a wildcard search is performed
    limitOffset = this.buildLimitOffset(1, defaultRecCount);
  } else {
    // const condition = this.buildHeaderRecFilterConditions(req, dateField);
    // filter = condition.filter;
    // limitOffset = condition.limitOffset;
    limitOffset = headerConditions.limitOffset; //rvin
  }
  if (req.IsHomeDelivery) {
    filter += this.buildEqualCondition(`T0."U_IsHomeDelivery"`, req.IsHomeDelivery);
    if (req.userId) {
      filter += this.buildEqualCondition(`T0."U_DeliveryAgentId"`, req.userId);
    }
  }

  const orderBy = ` ORDER BY T0."DocNum" DESC`;
  const sql = query + filter + orderBy + limitOffset;
  return sql;
};

/**
 * Build the entire sql with filter conds. & LIMIT, OFFSET & ORDER BY
 * @param {*} query Row level Query for the particular module
 * @param {*} req   Request from the Frontend
 */
exports.buildRowLevelQuery = (query, req) => {
  let filter = "";
  if (req.lineStatus) {
    filter += this.buildEqualCondition(`T1."LineStatus"`, req.lineStatus);
  }

  const orderBy = ` ORDER BY T1."LineNum" ASC`;
  const sql = query + `(${req.docNum.toString()})` + filter + orderBy;
  return sql;
};

/**
 * Add conds. to include all the cols. from a typical SAP Header table that are normally
 * used to filter recs.
 * @param {Object} req
 * @param {String} dateField Some modules like Inv. Counting has `CountDate` as Date field
 * @returns filter conditions & limitOffset
 */
exports.buildHeaderRecFilterConditions = (req, dateField) => {
  let filter = "",
    limitOffset = "";
  // Date Range filter
  if (req.fromDate && req.toDate) {
    filter += this.buildDateRangeCondition(`T0."${dateField}"`, req.fromDate, req.toDate);
  }
  // Customer based filter
  if (req.cardCode) {
    filter += this.buildEqualCondition(`T0."CardCode"`, req.cardCode);
  }
  // Doc Status based filter
  // if (req.docStatus) {
  //   filter += this.buildEqualCondition(`T0."DocStatus"`, req.docStatus);
  // }
  // --- FIX START: Handle placeholder values for docStatus ---
  if (req.docStatus && req.docStatus !== "-" && req.docStatus !== "ALL") {
    filter += this.buildEqualCondition(`T0."DocStatus"`, req.docStatus);
  }
  // --- FIX END ---
  // Location Name based filter
  if (req.locationName) {
    filter += this.buildEqualCondition(`T0."U_Location"`, req.locationName);
  }
  // Sales Employee
  if (req.salesEmployeeCode) {
    filter += this.buildEqualCondition(`T0."SlpCode"`, req.salesEmployeeCode);
  }

  // Pagination
  if (req.pageNum && req.pageSize) {
    limitOffset = this.buildLimitOffset(req.pageNum, req.pageSize);
  }
  return { filter, limitOffset };
};

/**
 * Returns LIMIT & OFFSET sql statement
 * @param {Number} pageNum
 * @param {Number} pageSize
 * @returns
 */
exports.buildLimitOffset = (pageNum = 1, pageSize) => {
  /**NOTE:
   * The 'limit' option allows you to limit the number of rows returned from a query,
   * while 'offset' allows you to omit a specified number of rows before the beginning of the result set.
   *
   * Below eg. specifies a limit of 5 rows starting from the 7th row (ie., the row immediately following
   * the value specified by offset),
   *    SELECT * FROM table1 ORDER BY column1 LIMIT 5 OFFSET 6
   * If there are only 10 rows in table1, the result will contain only the remaining 4 rows, even
   * though you specified a limit of 5 rows
   */
  let limitOffset = "";
  if (!isNaN(pageNum) && !isNaN(pageSize) && pageSize > 0) {
    const startIndex = (pageNum - 1) * pageSize;
    const endIndex = pageNum * pageSize;
    limitOffset = ` LIMIT ${pageSize} OFFSET ${startIndex} `;
  }
  return limitOffset;
};

/**
 * Builds & returns date range cond. based on the dates passed
 * @param {*} dateColumn Date Col. name. Sample: `T0."DocDate"`
 * @param {*} fromDate
 * @param {*} toDate
 */
exports.buildDateRangeCondition = (dateColumn, fromDate, toDate) => {
  let filter = "";
  if (isValidDate(fromDate) && isValidDate(toDate)) {
    //NOTE: the date value must be enclosed within '' for the query to return results
    filter = ` AND ${dateColumn} BETWEEN TO_DATE('${fromDate}') AND TO_DATE('${toDate}') `;
  }
  return filter;
};

/**
 * Returns search cond. based on the passed value
 * @param {String} column Column name with alias. Sample: 'T0."ItemCode"'
 * @param {*} value
 * @returns
 */
exports.buildEqualCondition = (column, value) => {
  let filter = "";
  if (column && value) {
    filter = ` AND ${column} = '${value}' `;
  }
  return filter;
};

/**
 * Returns wildcard search cond. based on the passed searchKey
 * @param {Array} columns Array of column names with alias. Sample: ['T0."ItemCode"', 'T0."ItemName"']
 * @param {*} searchKey
 * @returns
 */
exports.buildWildCardSearchCondition = (columns, searchKey) => {
  let filter = "";
  if (searchKey) {
    if (isNaN(searchKey)) {
      searchKey = searchKey.toUpperCase();
    }

    const conditions = columns.map((col) => `UPPER(${col}) LIKE '%${searchKey}%'`);
    filter = ` AND ( ${conditions.join(" OR ")} ) `;
    return filter;

    /* SAMPLE:
    filter = ` AND (
                UPPER(T0."ItemCode") LIKE '%${searchKey}%'
                  OR UPPER(T0."ItemName") LIKE '%${searchKey}%' ) `;
    */

    //this DIDN'T Work!
    /*filter = ` AND (
                UPPER(T0."ItemCode") LIKE '%?%'
                  OR UPPER(T0."ItemName") LIKE '%?%' ) `;
    values = [searchKey, searchKey, ...values];
    */
  }
};
