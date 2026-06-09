// service-layer-stock-transfer-request.9 b4 'Resubmit' Rejected rec..js

const cloneDeep = require("lodash.clonedeep");
const { serviceLayerAPI } = require("../config/service-layer-api");
const { getSLConnection } = require("../helper/service-layer-login");
const { sendMail } = require("../helper/send-mail");
const draftApprovalsHelper = require("../helper/draft-approvals");
const newRequestNotification = require("../mail-templates/new-request-notification");
const approveRejectNotification = require("../mail-templates/approval-rejection-notification");
const dbHelper = require("../helper/db");
const query = require("../config/hana-db");
const {
  portalModules,
  draftObjectCodes,
  draftStatus,
  systemCurrency,
  objectCodes,
  enableStoreBasedNumbering,
} = require("../config/config");
const { getRandomNo, formatDate } = require("../utils/utils");
const db = require("../helper/db");
const { getNumberingSeries } = require("../helper/numbering-series.js");

var cookie;

const createStockTransferRequest = async (req, res, next) => {
  console.log(`req.body: ${JSON.stringify(req.body)}`);
  const cookie = await getSLConnection(req);
  //console.log("createStockTransferRequest - cookie %s", cookie);
  if (cookie !== null) {
    const originatorId = req.session.userId;
    req.body.userId = req.session.userId;
    serviceLayerAPI.defaults.headers.Cookie = cookie;

    try {
      //check if the user has an Approver for the current Module (Stock Transfer Request)
      const approverRec = dbHelper.executeWithValues(query.selectApproverForOriginator, [
        originatorId,
        portalModules.STOCK_TRANSFER_REQUEST,
      ]);
      console.log("approverRec: " + JSON.stringify(approverRec)); //ApproverId, UserName, Email

      const originatorRec = dbHelper.executeWithValues(query.selectUserInfo, originatorId);
      let request = cloneDeep(req.body);
      // request.BPLID = 1; //BranchID
      if (request.branchId) {
        request.BPLID = request.branchId; //BranchID
        delete request.branchId;
      }
      request.U_OriginatorId = originatorId;

      delete request.userId; //deleting this prop to fix "Property 'userId' of 'StockTransfer' is invalid" when creating Draft

      //if the current user has an Approver create a Draft and mail him the info or else create a Stock Transfer Request directly
      if (Array.isArray(approverRec) && approverRec.length) {
        //Adding additional details for Draft creation
        request.DocObjectCode = draftObjectCodes.STOCK_TRANSFER_REQUEST; //Obj. Code is required for Draft API to create Draft
        //request.U_ApproverId = approverRec[0].ApproverId;
        request.U_DraftStatus = draftStatus.PENDING;
        request.U_MultiLevelApproval = approverRec[0].U_MultiLevelApproval;
        request.U_NoOfApprovals = parseInt(approverRec[0].U_NoOfApprovals, 10);

        console.log("*** createSTR Draft - request: " + JSON.stringify(request));
        const response = await serviceLayerAPI.post("StockTransferDrafts", request);
        console.log("*** DRAFTS response: " + response);

        if (response.data) {
          let approversList = [];
          approverRec.forEach((approver) => {
            approversList.push(approver.UserName);
          });
          res.status(200).send({
            draftNum: response.data.DocEntry, //DocNum is same for all the records (6567), so change it to DocEntry
            approverName: approversList.join(", "),
            response: response.data,
          });

          let multiApproverList = [],
            mailingList = [];
          let approvalLevel, approvalStatusId;

          approverRec.map((approver) => {
            /*rec = {};
            rec.U_ApprovalStatusId = getRandomNo();
            rec.U_DocEntry = response.data.DocEntry;
            rec.U_DraftStatus = draftStatus.PENDING;
            rec.U_ApproverId = approver.ApproverId;
            */
            approvalLevel = 0;
            approvalStatusId = getRandomNo();
            if (approver.U_MultiLevelApproval === "Y") {
              approvalLevel = approver.U_ApprovalLevel;

              //add only Level-1 Approver's mail to the mailing list if Multi-level Approval is enabled
              if (approver.U_ApprovalLevel == 1) {
                mailingList.push({
                  UserName: approver.UserName,
                  Email: approver.Email,
                });
                //Approver info to be inserted to Draft APPROVALSTATUS table
                //set the status as PENDING only for Level #1
                multiApproverList.push([
                  approvalStatusId,
                  approvalStatusId,
                  response.data.DocEntry,
                  draftStatus.PENDING,
                  approver.ApproverId,
                  approvalLevel,
                ]);
              } else {
                //NOT_ASSIGNED Approval requests will not showup in the Approvers "Stock Transfer Request" screen
                multiApproverList.push([
                  approvalStatusId,
                  approvalStatusId,
                  response.data.DocEntry,
                  draftStatus.NOT_ASSIGNED,
                  approver.ApproverId,
                  approvalLevel,
                ]);
              }
            } else {
              //add ALL the Approvers' mail to the mailing list if Multi-level Approval is NOT enabled
              mailingList.push({
                UserName: approver.UserName,
                Email: approver.Email,
              });
              multiApproverList.push([
                approvalStatusId,
                approvalStatusId,
                response.data.DocEntry,
                draftStatus.PENDING,
                approver.ApproverId,
                approvalLevel,
              ]);
            }
          });
          console.log("multiApproverList: " + multiApproverList);
          console.log("mailingList: " + mailingList);

          const draftApproverRec = dbHelper.executeBatchInsertUpdate(
            query.insertDraftApproversList,
            multiApproverList,
          );
          console.log("draftApproverRec: " + JSON.stringify(draftApproverRec)); //ApproverId, UserName, Email

          if (draftApproverRec) {
            //send a mail notification to the Approvers if the Draft has been saved successfully
            const mailBody = newRequestNotification.getMailBody(
              portalModules.STOCK_TRANSFER_REQUEST,
              originatorRec[0].UserName,
              response.data.DocEntry,
            );
            mailingList.forEach(async (item) => {
              await sendMail(item.Email, newRequestNotification.subject, mailBody);
            });
          }
        }
      }
      //Directly create a Inventory Transfer Request
      else {
        // let stockTransferLines = [...req.body.DocumentLines];
        let stockTransferLines = [...req.body.StockTransferLines];
        stockTransferLines.forEach((item) => {
          item.FromWarehouseCode = item.U_FromWarehouse;
          delete item.availableQuantity;
          delete item.U_FromWarehouse;
        });

        console.log("stockTransferLines: " + JSON.stringify(stockTransferLines));
        let request = {
          FromWarehouse: req.body.FromWarehouse,
          U_FromBinLoc: req.body.U_FromBinLoc,
          ToWarehouse: req.body.ToWarehouse,
          U_ToBinLocation: req.body.U_ToBinLocation,
          Comments: req.body.Comments,
          SalesPersonCode: req.body.SalesPersonCode,
          U_DraftStatus: draftStatus.AUTO_APPROVED, //throws this err Value too long in property 'U_DraftStatus' of 'StockTransfer'
          //StockTransferLines: req.body.DocumentLines, //threw - Property 'FromWarehouse' of 'StockTransferLine' is invalid
          StockTransferLines: stockTransferLines,
          U_OriginatorId: originatorId,
        };

        //Create Stock Transfer request by Numbering series when enableStoreBasedNumbering is true
        if (enableStoreBasedNumbering) {
          // Get Numbering Series.
          let seriesResponse = await getNumberingSeries(
            objectCodes[portalModules.STOCK_TRANSFER_REQUEST],
            req.session.userSessionLog.storeLocation,
          );
          if (seriesResponse) {
            console.log("seriesResponse series:", seriesResponse.Series);
            request.Series = seriesResponse.Series;
          }
        }

        console.log("InventoryTransferRequests - request: " + JSON.stringify(request));
        const response = await serviceLayerAPI.post("InventoryTransferRequests", request);
        //serviceLayerAPI.post("InventoryTransferRequests", req.body).then(response => {
        // console.log(`Create Stock Transfer Request response: ${JSON.stringify(response.data)}`);
        //response = response.data.value;
        //response = response;
        /**NOTE:
         * Previously I was checking below cond.
              if (response){...}
          which threw below error,
            "Converting circular structure to JSON"
          but "actual" response was in the "response.data"
        */
        if (response.data) {
          /**NOTE: Tried below two options but they threw below error,
              res.send(response.data.DocNum);
              res.status(200).send(response.data.DocNum);
            Error:
              Invalid status code: 6465..
              RangeError [ERR_HTTP_INVALID_STATUS_CODE]: Invalid status code: 6461
            (here 6465 is Stock Transfer Request's DocNum. DocNum was sent as "status code" causing the issue
          */
          res.status(200).send({
            stockTransferRequestNum: response.data.DocNum,
            // response: response.data
          });
        } else {
          console.log("Create Stock Transfer Request failed!.. Error-400");
          res.status(500).json({ error: { message: "Stock Transfer Request Creation failed" } });
        }
      }
    } catch (error) {
      console.log("Create Stock Transfer Request error: " + error);
      next(error);
    }
  } else {
    res
      .status(500)
      .send({ error: "Unable to connect to the server. Please contact Administrator!" });
  }
};

/**
 *
 * @param {JSON}   request Stock Transfer Request Draft request payload
 * @param {Object} res     Response obj. to send back the response
 * @param {String} approvalStatus Status to be set to APPROVALSTATUS table
 * @param {String} multiLevelApproval 'Y' or 'N'
 */

const updateDraftAndNotifyOriginator = async (request, res, approvalStatus, multiLevelApproval) => {
  try {
    console.log("updateDraftAndNotifyOriginator: " + JSON.stringify(request));
    let strResponse, response;
    response = await serviceLayerAPI.patch(`Drafts(${request.DocEntry})`, request);
    console.log("PATCH Draft - response.data: " + JSON.stringify(response.data));

    //if the Draft is APPROVED, create a Stock Transfer Request using the Draft
    if (request.U_DraftStatus == draftStatus.APPROVED) {
      try {
        //TODO: Need to pull only the required fields from below API. All the 'get' methods to Service
        //Layer must be optimized to pull only the REQUIRED values instead of pulling them all
        let draftResponse = await serviceLayerAPI.get(`StockTransferDrafts(${request.DocEntry})`);
        draftResponse = draftResponse.data;
        console.log("draftResponse: " + JSON.stringify(draftResponse));
        let documentLines = [],
          docLine = {};

        //NOTE: Changing the above API from 'Drafts' to 'StockTransferDrafts' & using replacing 'DocumentLines'
        //with 'StockTransferLines' below fixed the issue with Header Level WH loc. is diff. from line level
        //WH Loc. error
        if (
          Array.isArray(draftResponse.StockTransferLines) &&
          draftResponse.StockTransferLines.length
        ) {
          draftResponse.StockTransferLines.forEach((line) => {
            docLine = {
              LineNum: line.LineNum,
              ItemCode: line.ItemCode,
              Quantity: line.Quantity,
              // BaseType: line.BaseType,
              // BaseEntry: line.BaseEntry,
              // BaseLine: line.BaseLine,
              MeasureUnit: line.MeasureUnit,
              WarehouseCode: line.WarehouseCode,
              FromWarehouseCode: line.U_FromWarehouse,
              U_ToBinLocation: line.U_ToBinLocation,
            };
            documentLines.push(docLine);
          });
        }
        //sort the items (in asc order) based on BaseLine or
        documentLines.sort((a, b) => a.BaseLine - b.BaseLine);

        const strRequest = {
          //set the Default BranchID if the Draft's BranchID is not set
          // BPLID: draftResponse.BPLID ? draftResponse.BPLID : 1, //BranchID
          DocDate: draftResponse.DocDate,
          // CreationDate: draftResponse.CreationDate,
          // DocObjectCode: draftResponse.DocObjectCode,

          /** Replacing this with below UDF U_FromWarehouse as SAP doesnt store From Warehouse info
           * in Drafts by default
           * FromWarehouse: draftResponse.FromWarehouse,
           */
          FromWarehouse: draftResponse.FromWarehouse,
          U_ToBinLocation: draftResponse.U_ToBinLocation,
          ToWarehouse: draftResponse.ToWarehouse,
          Comments: draftResponse.Comments,
          U_OriginatorId: draftResponse.U_OriginatorId,
          U_ApproverId: draftResponse.U_ApproverId,
          U_DraftStatus: draftResponse.U_DraftStatus,
          U_MultiLevelApproval: draftResponse.U_MultiLevelApproval,
          U_NoOfApprovals: parseInt(draftResponse.U_NoOfApprovals, 10),
          U_DraftDocEntry: request.DocEntry, //Base Draft's DocEntry
          StockTransferLines: documentLines,
        };
        if (draftResponse.BPLID) {
          strRequest.BPLID = draftResponse.BPLID;
        }

        console.log("InventoryTransferRequests - request: " + JSON.stringify(strRequest));
        strResponse = await serviceLayerAPI.post("InventoryTransferRequests", strRequest);
        //console.log("***strResponse: "+ strResponse);
      } catch (error) {
        const resetDraftStatus = await serviceLayerAPI.patch(`Drafts(${request.DocEntry})`, {
          U_DraftStatus: draftStatus.PENDING,
        });
        console.log("resetDraftStatus - response.data: " + resetDraftStatus);
        throw error;
      }
    }

    if (response || strResponse) {
      /**TODO: Can add a 'helper' method to perform below op.. Bcoz this is common to all
       * Modules - STR, ST
       */
      //Perform the update on Multi-Approver data in @APPROVALSTATUS table only when the above Service Layer
      //APIs are executed without any error
      const draftApproverRec = dbHelper.executeWithValues(query.updateDraftApproversList, [
        approvalStatus,
        request.U_RejectedReason,
        formatDate(new Date(), "YYYY-MM-DD HH24:MI:SS.FF2"),
        request.U_ApprovalStatusId,
      ]);
      //console.log("draftApproverRec: "+ JSON.stringify(draftApproverRec));

      //Set the status of other Approvers as REJECTED when a Draft is rejected by one of the Approvers
      if (approvalStatus === draftStatus.REJECTED) {
        draftApprovalsHelper.setApprovalStatus(approvalStatus, request.DocEntry);
      }
      if (strResponse) {
        //Set the STR's DocNum to the Draft rec. for tracking purpose
        const setTargetRecDocNum = await serviceLayerAPI.patch(`Drafts(${request.DocEntry})`, {
          U_TargetRecDocNum: strResponse.data.DocNum,
        });

        //Set the status of other Approvers as GENERATED when a Target Rec. is created from a Draft
        //NOTE: This is not applicable when Multi-level Approval setup is enabled
        if (multiLevelApproval !== "Y") {
          draftApprovalsHelper.setApprovalStatus(draftStatus.APPROVED, request.DocEntry);
        }
      }

      //notify the Originator
      const originatorRec = dbHelper.executeWithValues(
        query.selectUserInfo,
        request.U_OriginatorId,
      );
      const approverRec = dbHelper.executeWithValues(query.selectUserInfo, request.userId);

      console.log("originatorRec: " + JSON.stringify(originatorRec));
      console.log("approverRec: " + JSON.stringify(approverRec));

      /* NOTE: request.U_DraftStatus's value changes to "PENDING" if the No. of Received Approvals
      is < than No. of Required Approvals though the current Approver has APPROVED the Draft */
      let status;
      if ([draftStatus.APPROVED, draftStatus.PENDING].includes(request.U_DraftStatus))
        status = draftStatus.APPROVED;
      else
        //if (request.U_DraftStatus === draftStatus.REJECTED)
        status = request.U_DraftStatus; //draftStatus.REJECTED;

      if (
        Array.isArray(approverRec) &&
        approverRec.length &&
        Array.isArray(originatorRec) &&
        originatorRec.length
      ) {
        const mailBody = approveRejectNotification.getMailBody(
          portalModules.STOCK_TRANSFER_REQUEST,
          originatorRec[0].UserName,
          approverRec[0].UserName,
          request.DocEntry,
          status,
        );
        await sendMail(originatorRec[0].Email, approveRejectNotification.subject, mailBody);
      }

      let noOfDays;
      //get the No. of Days b/w Creation Date (or prev. Approval Date) & the Draft Creation Date
      if (approvalStatus === draftStatus.APPROVED) {
        noOfDays = draftApprovalsHelper.getApprovalInternalInDays(
          request.DocEntry,
          request.U_ApprovalLevel,
          multiLevelApproval,
        );
      }

      //send the response back to front end
      res.status(200).send({
        draftStatus: status,
        noOfDays,
      });
    }
  } catch (error) {
    next(error);
  }
};

const updateDraft = async (req, res, next) => {
  console.log(`req.body: ${JSON.stringify(req.body)}`);
  req.body.userId = req.session.userId;
  let cookie;
  try {
    cookie = await getSLConnection(req);
  } catch (error) {
    console.log("updateDraft: " + JSON.stringify(error));
    next(error);
  }
  let request = req.body;
  //console.log("createStockTransferRequest - cookie %s", cookie);
  if (cookie) {
    serviceLayerAPI.defaults.headers.Cookie = cookie;
    try {
      /** Moving this code to updateDraftAndNotifyOriginator funct. Bcoz adding the code here UPDATEs
       * the UDT even before the PATCH operation on 'Drafts' API is performed, in case if an error is thrown
       * during the PATCH operation the UPDATE operation shouldnt be performed.
       * 
      //update Multi-Approver data in @APPROVALSTATUS table
      const draftApproverRec = dbHelper.executeWithValues(
        query.updateDraftApproversList, [request.U_DraftStatus, request.U_RejectedReason, request.U_ApprovalStatusId]);
      console.log("draftApproverRec: "+ JSON.stringify(draftApproverRec));
      */
      const approvalStatus = request.U_DraftStatus;

      //NOTE: Using "strict equality" (===) DIDN'T Work here
      if (request.U_DraftStatus == draftStatus.APPROVED) {
        //get the NO. of approvals required for the Draft
        const draftApprovalDetails = dbHelper.executeWithValues(query.selectNoOfApprovalsForDraft, [
          draftObjectCodes.STOCK_TRANSFER_REQUEST,
          request.DocEntry,
        ]);
        console.log("draftApprovalDetails: " + JSON.stringify(draftApprovalDetails));
        let noOfApprovalsRequired = 0,
          multiLevelApproval;
        if (Array.isArray(draftApprovalDetails) && draftApprovalDetails.length) {
          noOfApprovalsRequired = parseInt(draftApprovalDetails[0].U_NoOfApprovals, 10);
          multiLevelApproval = draftApprovalDetails[0].U_MultiLevelApproval;
        }
        console.log("noOfApprovalsRequired: " + noOfApprovalsRequired);

        if (multiLevelApproval === "Y") {
          //if the Current Approver's ApprovalLeve is equal to No. of Approvals required,
          //set the Draft status as APPROVED else set it as PENDING
          if (parseInt(request.U_ApprovalLevel) == noOfApprovalsRequired)
            request.U_DraftStatus = draftStatus.APPROVED;
          else if (parseInt(request.U_ApprovalLevel) < noOfApprovalsRequired)
            request.U_DraftStatus = draftStatus.PENDING; //change status from NOT_ASSIGNED to PENDING

          await updateDraftAndNotifyOriginator(request, res, approvalStatus, multiLevelApproval);

          //if the status is PENDING set the next Approvers' status as PENDING & notify him
          if (request.U_DraftStatus == draftStatus.PENDING) {
            const nextApprovalLevel = parseInt(request.U_ApprovalLevel) + 1;
            //set next approver's status as PENDING
            const setNextApprovalStatus = dbHelper.executeWithValues(
              query.updateDraftNextApprovalLevel,
              [draftStatus.PENDING, request.DocEntry, nextApprovalLevel],
            );
            console.log("setNextApprovalStatus: " + JSON.stringify(setNextApprovalStatus));

            const originatorRec = dbHelper.executeWithValues(
              query.selectUserInfo,
              request.U_OriginatorId,
            );

            //Notify the Approver who is in the next Approval heirarchy
            const nextApproverDetails = dbHelper.executeWithValues(
              query.selectDraftNextApproverDetails,
              [request.DocEntry, nextApprovalLevel],
            );
            console.log("nextApproverDetails: " + JSON.stringify(nextApproverDetails));
            if (
              Array.isArray(nextApproverDetails) &&
              nextApproverDetails.length &&
              originatorRec.length
            ) {
              const mailBody = newRequestNotification.getMailBody(
                portalModules.STOCK_TRANSFER_REQUEST,
                originatorRec[0].UserName,
                request.DocEntry,
              );
              await sendMail(
                nextApproverDetails[0].Email,
                newRequestNotification.subject,
                mailBody,
              );
            }
          }
        } else {
          //check if the No. of approvals given is Greater than or Equal to No. of Required approvals
          const approvedStatus = dbHelper.executeWithValues(query.selectDraftApprovalStatusCount, [
            request.DocEntry,
            request.U_DraftStatus,
          ]);
          console.log("approvedStatus: " + JSON.stringify(approvedStatus));
          let noOfApprovalsReceived = 0;
          if (Array.isArray(approvedStatus) && approvedStatus.length) {
            noOfApprovalsReceived = approvedStatus[0].Count;
          }
          console.log("noOfApprovalsReceived: " + noOfApprovalsReceived);

          //if the No. of required approvals is already provided for a Draft
          //or if  the sum of 'noOfApprovalsReceived' and the 'current' APPROVAL (the one that is not
          //saved to db yet) which is being processed at this time is >= noOfApprovalsRequired,
          //then set the status as APPROVED
          if (parseInt(noOfApprovalsReceived, 10) + 1 >= parseInt(noOfApprovalsRequired, 10)) {
            request.U_DraftStatus = draftStatus.APPROVED;
            console.log("****APPROVED");
          } else {
            request.U_DraftStatus = draftStatus.PENDING;
            console.log("****PENDING");
          }
          await updateDraftAndNotifyOriginator(request, res, approvalStatus, multiLevelApproval);
        }
      }
      //Do nothing if the status is REJECTED. This will set the Draft status as REJECTED
      //NOTE: Using "strict equality" (===) DIDN'T Work here
      else if (request.U_DraftStatus == draftStatus.REJECTED) {
        console.log("****REJECTED");
        await updateDraftAndNotifyOriginator(request, res, approvalStatus);
      }
    } catch (error) {
      console.log("Stock Transfer Request Draft error: " + error);
      next(error);
    }
  } else {
    res
      .status(500)
      .send({ error: "Unable to connect to the server. Please contact Administrator!" });
  }
};

module.exports = { createStockTransferRequest, updateDraft };
