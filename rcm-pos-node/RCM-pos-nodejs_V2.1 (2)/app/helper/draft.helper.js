const dbHelper = require("./db");
const { userRoles, draftStatus, portalModules } = require("../config/config");
const query = require("../config/query-drafts");

const orderBy = ` ORDER BY T0."DocEntry" ASC`;

/**
 * Gets Drafts
 * @param {*} where
 * @param {*} filter
 * @returns
 */
exports.getDrafts = (where = "", filters = []) => {
  try {
    let sql = query.selectDrafts;
    const rows = dbHelper.executeWithValues(sql + where + orderBy, filters);
    console.log("getDraftItems: " + JSON.stringify(rows));
    return rows;
  } catch (err) {
    throw err;
  }
};

/**
 * Gets Drafts
 * @param {*} objectType
 * @param {*} approverId
 * @returns
 */
exports.getDraftsForApprover = (objectType, approverId) => {
  try {
    const rows = dbHelper.executeWithValues(query.selectDraftsWithMultiApprover, [
      objectType,
      approverId,
    ]);
    console.log("getDraftItems: " + JSON.stringify(rows));
    return rows;
  } catch (err) {
    throw err;
  }
};

/**
 * Gets Items under a Draft
 * @param {*} docEntry
 * @returns
 */
exports.getDraftItems = (docEntry) => {
  try {
    const rows = dbHelper.executeWithValues(query.selectItemDetailsForDrafts + `(${docEntry})`, []);
    console.log("getDraftItems: " + JSON.stringify(rows));
    return rows;
  } catch (err) {
    throw err;
  }
};

/**
 * NOTE: In future this method can be modififed to  pull other 'Tax' related info too.
 * For now it is used to pull TaxTotal
 * Get TaxToal for a given GRPO (Draft), used to display TaxTotal in 'View GRPO > Item Details tab'
 */
exports.getDraftTax = (docEntry) => {
  try {
    const rows = dbHelper.executeWithValues(query.selectDraftTaxTotal + `(${docEntry})`, []);
    console.log("getDraftTax: " + JSON.stringify(rows));
    return rows;
  } catch (err) {
    throw err;
  }
};

/**
 * Updates a Draft with the given data
 * @param {*} request
 * @param {*} condition
 * @returns
 */
exports.updateDraft = (request, condition) => {
  let columns = [],
    values = [],
    where = ` WHERE `;

  if (request.U_TargetRecDocNum) {
    columns.push(`T0."U_TargetRecDocNum" = ?`);
    values.push(request.U_TargetRecDocNum);
  }
  if (request.U_DraftStatus) {
    columns.push(`T0."U_DraftStatus" = ?`);
    values.push(request.U_DraftStatus);
  }

  //WHERE
  if (condition.DocEntry) {
    where = where + `T0."DocEntry" = ?`;
    values.push(condition.DocEntry);
  } else if (condition.DocNum) {
    where = where + `T0."DocNum" = ?`;
    values.push(condition.DocNum);
  }

  try {
    const sql = query.updateDraft + columns.join() + where;
    console.log("updateDraft - sql: ", sql);
    console.log("updateDraft - values: ", values.join());
    const result = dbHelper.executeWithValues(sql, values);
    if (Array.isArray(result) && result.length > 0) {
      return result;
    }
    return;
  } catch (err) {
    throw err;
  }
};
