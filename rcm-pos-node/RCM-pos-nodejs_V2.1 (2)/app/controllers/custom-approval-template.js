const dbHelper = require("../helper/db");
const query = require("../config/hana-db");
const { getRandomNo } = require("../utils/utils");

const constants = {
  TEMPLATE: "TEMPLATE",
  ORIGINATOR: "ORIGINATOR",
  APPROVER: "APPROVER",
};

//declaring this as a global variable boz this array will used for all the Originator/Approver recs. under a Template
let originatorPrimaryKeyList = [],
  approverPrimaryKeyList = [];

/** Get the Primary Key based on the current IDs in the db */
const getPrimaryKey = (type, docEntry) => {
  console.log("BEFORE: approverPrimaryKeyList: " + JSON.stringify(approverPrimaryKeyList));
  console.log("docEntry: " + docEntry);
  let sql,
    primaryKeyList = [];
  let primaryKey = 1; //set the default value as "1", which will be returned if it is the 1st rec.
  let key = "LineId"; //sample list for "APPROVER" or ORIGINATOR rec., [{"LineId":1}, {"LineId":2}]]
  if (type === constants.TEMPLATE) {
    sql = query.allHeaderIds;
    key = "DocEntry"; //sample list for "TEMPLATE" rec., [{"DocEntry":1}, {"DocEntry":2}]]
  } else if (type === constants.APPROVER) sql = query.allApproverIds;
  else if (type === constants.ORIGINATOR) sql = query.allOriginatorIds;
  try {
    if (type === constants.ORIGINATOR) {
      if (originatorPrimaryKeyList.length > 0) primaryKeyList = originatorPrimaryKeyList;
      else {
        primaryKeyList = dbHelper.executeWithValues(sql, docEntry);
        if (primaryKeyList.length > 0) originatorPrimaryKeyList = primaryKeyList;
        /*if there is no Originator rec. for the Template (this case is satisfied by new Template recs. b4
         getting saved to the db)
        */ else {
          originatorPrimaryKeyList.push({ LineId: primaryKey });
          return primaryKey;
        }
      }
    } else if (type === constants.APPROVER) {
      if (approverPrimaryKeyList.length > 0) primaryKeyList = approverPrimaryKeyList;
      else {
        primaryKeyList = dbHelper.executeWithValues(sql, docEntry);
        if (primaryKeyList.length > 0) approverPrimaryKeyList = primaryKeyList;

        /* else if there is no Approver rec. for the Template (this case is satisfied by new Template recs. b4
         getting saved to the db) */ else {
          approverPrimaryKeyList.push({ LineId: primaryKey });
          return primaryKey;
        }
      }
    } else {
      primaryKeyList = dbHelper.executeWithValues(sql, docEntry);
    }
    console.log("primaryKeyList %s", JSON.stringify(primaryKeyList));
    const length = primaryKeyList.length;
    if (length) {
      //if the last number in the list is equal to the total no. of records (lenght of the array)
      //ie., all the numbers are present in the same order, no number was deleted in the middle
      if (primaryKeyList[length - 1][key] === length) {
        primaryKey = length + 1; //set the next no. in the order as the primaryKey
        if (type === constants.ORIGINATOR) {
          originatorPrimaryKeyList.push({ LineId: primaryKey });
        } else if (type === constants.APPROVER) {
          approverPrimaryKeyList.push({ LineId: primaryKey });
        }
      } else {
        if (length > 0) {
          //loop through all the numbers b/w 1 and the biggest no. in the array,
          //ie., the last no.(primaryKeyList[length-1]). Bcoz the array is sorted ascendingly
          for (let i = 0; i < primaryKeyList[length - 1][key]; i++) {
            //Ideally, LineNId/DocNum must be equal to index+1 when no rec. in b/w is deleted,
            //bcoz in SAP Primary keys start from '1' and goes on in a sequential order
            if (primaryKeyList[i][key] != i + 1) {
              //or > than i+1
              primaryKey = i + 1;

              /** add the new Primary Key to the array if the type is ORIGINATOR.
                When more than one Originator rec. is added under a Template, from the 2nd rec. onwards 
                this array will be used to find the Primary Key, instead of "primaryKey" array.
                "primaryKey" only has the IDs in the db, the IDs that are not yet saved in the db will 
                not be present in it, so getting Primary keys based on that array caused "Unique Constraint Violated"
                error, as the same Primary key was appied for all the Originator recs. under a Template.
                Adding the new PM to "originatorPrimaryKeyList"
                and checking against it from teh 2nd rec. onwards will fix this issue
              */
              if (type === constants.ORIGINATOR)
                originatorPrimaryKeyList.splice(i, 0, { LineId: primaryKey });
              else if (type === constants.APPROVER)
                approverPrimaryKeyList.splice(i, 0, { LineId: primaryKey });
              break;
            }
          }
        }
      }
    }
    console.log("AFTER: approverPrimaryKeyList: " + JSON.stringify(approverPrimaryKeyList));
    console.log("primaryKey: " + primaryKey);
    return primaryKey;
  } catch (err) {
    throw err;
  }
};

/**
 * Get all Approval Templates
 */
const getApprovalTemplateList = () => {
  let approvalHeaderList = [],
    approvalOriginatorList = [],
    approvalApproverList = [];
  try {
    approvalHeaderList = dbHelper.executeWithValues(query.selectApprovalHeader);
    console.log("approvalHeaderList %s", JSON.stringify(approvalHeaderList));
    if (approvalHeaderList.length) {
      let originatorTempList = [],
        approverTempList = [];

      approvalOriginatorList = dbHelper.executeWithValues(query.selectApprovalOriginator);
      console.log("approvalOriginatorList.length: " + approvalOriginatorList.length);

      approvalApproverList = dbHelper.executeWithValues(query.selectApprovalApprover);
      console.log("approvalApproverList.length: " + approvalApproverList.length);
      //console.log("selectApprovalApprover %s", JSON.stringify(approvalApproverList));

      approvalHeaderList.forEach((header) => {
        ((originatorTempList = []), (approverTempList = []));
        approvalOriginatorList.forEach((originator) => {
          if (header.DocEntry === originator.DocEntry) {
            originatorTempList.push(originator);
          }
        });
        header.Originator = originatorTempList;

        approvalApproverList.forEach((approver) => {
          if (header.DocEntry === approver.DocEntry) {
            approverTempList.push(approver);
          }
        });
        header.Approver = approverTempList;
      });
    }
  } catch (err) {
    throw err;
  } finally {
    return approvalHeaderList;
  }
};

const getApprovalTemplates = (req, res) => {
  try {
    res.send(getApprovalTemplateList());
  } catch (err) {
    console.log("getApprovalTemplates - controller - error: " + JSON.stringify(err));
    res.status(500).send({ error: err.message });
  }
};

/**
 * Create Approval Template
 */
const createUpdateApprovalTemplate = (req, res, next) => {
  console.log("req.body: %s", JSON.stringify(req.body));
  let approverLineId,
    originatorLineId,
    approverValuesForInsert = [],
    approverValuesForUpdate = [],
    originatorValuesForInsert = [],
    originatorValuesForUpdate = [];

  //set UPDATE query as default
  let approvalHeaderQuery = query.updateApprovalHeader;

  let approvalTemplateId = req.body.activeApprovalTemplateId;
  //set a primary key & change the query as INSERT
  if (!approvalTemplateId) {
    approvalTemplateId = getPrimaryKey(constants.TEMPLATE);
    approvalHeaderQuery = query.insertApprovalHeader;
  }
  const approvalHeaderValues = [
    req.body.templateName,
    req.body.description,
    req.body.moduleId,
    req.body.terms,
    req.body.noOfApprovals,
    req.body.multiLevelApproval,
    req.body.isActive,
    approvalTemplateId,
  ]; //setting '1' for NoOfApprovals
  console.log("approvalHeaderValues: " + approvalHeaderValues);

  let approvalLevel;
  req.body.activeApprovalApproverList.forEach((rec) => {
    approverLineId = rec.LineId;
    approvalLevel = !isNaN(parseInt(rec.U_ApprovalLevel, 10))
      ? parseInt(rec.U_ApprovalLevel, 10)
      : null;
    if (!approverLineId) {
      approverLineId = getPrimaryKey(constants.APPROVER, approvalTemplateId);
      approverValuesForInsert.push([
        rec.U_UserId,
        approvalLevel,
        approvalTemplateId,
        approverLineId,
      ]);
      console.log("approverValuesForInsert: " + approverValuesForInsert);
    } else {
      approverValuesForUpdate.push([
        rec.U_UserId,
        approvalLevel,
        approvalTemplateId,
        approverLineId,
      ]);
      console.log("approverValuesForUpdate: " + approverValuesForUpdate);
    }
  });

  req.body.activeApprovalOriginatorList.forEach((rec) => {
    originatorLineId = rec.LineId;
    if (!originatorLineId) {
      originatorLineId = getPrimaryKey(constants.ORIGINATOR, approvalTemplateId);
      originatorValuesForInsert.push([rec.U_UserId, approvalTemplateId, originatorLineId]);
      console.log("originatorValuesForInsert: " + originatorValuesForInsert);
    } else {
      originatorValuesForUpdate.push([rec.U_UserId, approvalTemplateId, originatorLineId]);
      console.log("originatorValuesForUpdate: " + originatorValuesForUpdate);
    }
  });

  try {
    //Create the Template Header & Child records
    const rows = dbHelper.executeWithValues(approvalHeaderQuery, approvalHeaderValues);
    let insertApproverRows = 0,
      updateApproverRows = 0,
      insertOriginatorRows = 0,
      updateOriginatorRows = 0;
    if (rows) {
      if (approverValuesForInsert.length > 0)
        insertApproverRows = dbHelper.executeBatchInsertUpdate(
          query.insertApprovalApprover,
          approverValuesForInsert,
        );
      console.log("insertApproverRows: " + insertApproverRows);
      if (approverValuesForUpdate.length > 0)
        updateApproverRows = dbHelper.executeBatchInsertUpdate(
          query.updateApprovalApprover,
          approverValuesForUpdate,
        );
      console.log("updateApproverRows: " + updateApproverRows);

      if (originatorValuesForInsert.length > 0)
        insertOriginatorRows = dbHelper.executeBatchInsertUpdate(
          query.insertApprovalOriginator,
          originatorValuesForInsert,
        );
      console.log("insertOriginatorRows: " + insertOriginatorRows);
      if (originatorValuesForUpdate.length > 0)
        updateOriginatorRows = dbHelper.executeBatchInsertUpdate(
          query.updateApprovalOriginator,
          originatorValuesForUpdate,
        );
      console.log("updateOriginatorRows: " + updateOriginatorRows);
      //if records are created or updated successfully send back the updated User Groups list
      if (
        insertApproverRows + updateApproverRows + insertOriginatorRows + updateOriginatorRows >
        0
      ) {
        res.status(200).send(getApprovalTemplateList());
      } else {
        res.status(201).send({});
      }
    } else {
      console.log("createUpdateApprovalTemplate -inner catch - error: " + JSON.stringify(err));
      res.status(500).send({ message: "Unable to create new User Group" });
    }
  } catch (err) {
    console.log("createUpdateApprovalTemplate - controller - error: " + err.message);
    res.status(500).send({ message: err.message });
    //next(err);
  } finally {
    /* reset this list after the insert/update operation is complete or this same array values will be used
      for determining the Primary key for the next record that is saved or updated via UI
    */
    originatorPrimaryKeyList = [];
  }
};

/**
 * Delete Approval Template, Originator or Approver
 */
const deleteApprovalTemplate = (req, res, next) => {
  console.log("req.param.templateId: %s", req.params.templateId);
  console.log("req.param.lineId: %s", req.params.lineId);
  console.log("req.param.recordType: %s", req.params.recordType);

  let originatorRows = 0,
    approverRows = 0,
    templateRows = 0;
  try {
    //request to delete whole Approval Template
    if (req.params.recordType == constants.TEMPLATE) {
      originatorRows = dbHelper.executeWithValues(
        query.deleteApprovalTemplate3,
        req.params.templateId,
      );
      approverRows = dbHelper.executeWithValues(
        query.deleteApprovalTemplate2,
        req.params.templateId,
      );
      //Deleting Template rec. alone is NOT enough, like I thought initially
      templateRows = dbHelper.executeWithValues(
        query.deleteApprovalTemplate1,
        req.params.templateId,
      );
    }
    //request to delete only the Approver
    else if (req.params.recordType == constants.APPROVER) {
      approverRows = dbHelper.executeWithValues(query.deleteApprovalApprover, [
        req.params.templateId,
        req.params.lineId,
      ]);
    }
    //request to delete only the Originator
    else if (req.params.recordType == constants.ORIGINATOR) {
      originatorRows = dbHelper.executeWithValues(query.deleteApprovalOriginator, [
        req.params.templateId,
        req.params.lineId,
      ]);
    }
    /* Currently user cant add more than one Approver, so commenting this out.
    else if (req.params.recordType == constants.APPROVER) {
      approverRows = dbHelper.executeWithValues(query.deleteApprovalApprover, req.params.templateId);
    }*/
    console.log(
      "templateRows: " +
        templateRows +
        " originatorRows: " +
        originatorRows +
        "approverRows: " +
        approverRows,
    );
    //if the record is deleted successfully send the updated User Groups list
    if (templateRows > 0 || originatorRows > 0 || approverRows > 0) {
      res.status(200).send(getApprovalTemplateList());
    } else {
      res.status(201).send({});
    }
  } catch (err) {
    console.log("deleteApprovalTemplate - controller - error: " + JSON.stringify(err));
    res.status(500).send({ message: err.message });
  }
};

module.exports = { getApprovalTemplates, createUpdateApprovalTemplate, deleteApprovalTemplate };
