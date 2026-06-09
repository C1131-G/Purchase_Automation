/**
 * SAMPLE - NOT Required for POS
 */

const cloneDeep = require("lodash.clonedeep");
const { serviceLayerAPI } = require("../config/service-layer-api");
const { sendMail } = require("../helper/send-mail");
const draftApprovalsHelper = require("../helper/draft-approvals");
const welcomeMail = require("../mail-templates/welcome-mail");
const newRequestNotification = require("../mail-templates/new-request-notification");
const approveRejectNotification = require("../mail-templates/approval-rejection-notification");
const dbHelper = require("../helper/db");
const query = require("../config/hana-db");
const deliveryQuery = require("../config/query-delivery");
const {
  portalModules,
  draftStatus,
  draftObjectCodes,
  systemCurrency,
  serviceLayerApiURIs,
  recordTypes,
} = require("../config/config");
const { getRandomNo, formatDate } = require("../utils/utils");

const draftHelper = require("./draft.helper");
const serviceLayerDraftHelper = require("./service-layer-draft.helper.js");

const moduleName = portalModules.DELIVERY;
const serviceLayerURI = serviceLayerApiURIs[moduleName];

/**
 * Creates a Delivery Draft & returns the DocEntry
 * @param {*} request                 Draft req. payload
 * @param {*} approverRec             Draft Originator's Approver rec.
 * @param {*} cookie
 * @returns
 */
exports.createDeliveryDraft = async (request, approverRec, cookie) => {
  console.log(`request: ${JSON.stringify(request)}`);
  if (cookie) {
    serviceLayerAPI.defaults.headers.Cookie = cookie;

    try {
      if (request.branchId) {
        request.BPL_IDAssignedToInvoice = request.branchId; //BranchID
        delete request.branchId;
      }
      request.U_OriginatorId = request.userId;

      //if the current user has an Approver create a Draft and mail him the info or else create a Delivery directly

      //NOTE: this cond. check is not required when the Draft is created for QC, bcoz even if an Originator
      //doesnt have an Approver, still a Draft will be created for QC inspection
      if (Array.isArray(approverRec) && approverRec.length) {
        //Adding additional details for Draft creation
        request.DocObjectCode = draftObjectCodes[moduleName]; //"20" is the Obj. Code for Delivery. This is required for Draft API to create Delivery Draft

        //Set the status as PENDING only when a status is not already set.
        if (!request.U_DraftStatus) {
          request.U_DraftStatus = draftStatus.PENDING;
        }
        request.U_MultiLevelApproval = approverRec ? approverRec[0].U_MultiLevelApproval : "";
        request.U_NoOfApprovals = approverRec ? parseInt(approverRec[0].U_NoOfApprovals, 10) : 0;

        console.log("*** DRAFTS request: " + JSON.stringify(request));
        const response = await serviceLayerAPI.post("Drafts", request);
        console.log("*** DRAFTS response: " + response);

        if (response.data) {
          return { draftNum: response.data.DocEntry }; //DocNum is same for all the records (6567), so change it to DocEntry
        }
        return;
      } else {
        //Directly create a Delivery
        request.U_DraftStatus = draftStatus.AUTO_APPROVED;
        const response = await this.createDelivery(request, cookie);
        if (response) {
          return { docNum: response.data.DocNum };
        }
        return;
      }
    } catch (error) {
      console.log("Create Delivery error: " + error);
      throw error;
    }
  } else {
    throw new Error("Unable to connect to the server. Please contact Administrator!");
  }
};

exports.createDelivery = async (request, cookie) => {
  console.log(`request: ${JSON.stringify(request)}`);
  try {
    serviceLayerAPI.defaults.headers.Cookie = cookie;

    // let request = cloneDeep(request);
    if (request.branchId) {
      request.BPL_IDAssignedToInvoice = request.branchId; //BranchID
      delete request.branchId;
    }
    request.U_OriginatorId = request.userId;
    request.U_DraftStatus = draftStatus.AUTO_APPROVED;

    console.log("*** Delivery request: " + JSON.stringify(request));
    const response = await serviceLayerAPI.post(serviceLayerURI, request);
    console.log(`Create Delivery response: ${JSON.stringify(response.data)}`);

    if (response.data) {
      // res.status(200).send({
      //   docNum: response.data.DocNum,
      //   response: response.data
      // });
      return response.data;
    }
    return;
    // else {
    //   console.log("Create Delivery failed!.. Error-400");
    //   res.status(500).json({error: {message: "Delivery Creation failed"} });
    // }
  } catch (error) {
    console.log("Create Delivery error: " + error);
    throw error;
  }
};

/** Returns array of BatchNumber or SerialNumber based on the "itemType" passed. Below are sample return values
 ** Batch item, {
 *    "BatchNumberProperty":"2004211-21/05/2020-0047256006",
 *    "Quantity":8,
 *    "BaseLineNumber":3
 * }
 ** SerialNo. item, {
 *    "InternalSerialNumber":"T/20/1590047258185",
 *    "Quantity":4,
 *    "BaseLineNumber":1
 * }
 *
 * @param {String} itemType         Batch or Serial
 * @param {Array}  batchSerialList  Array of Batch or Serial list
 */
const getBatchSerialList = (itemType, batchSerialList) => {
  let batchORSerialNumbersList = [],
    batchORSerialNumber = {};

  if (Array.isArray(batchSerialList) && batchSerialList.length) {
    batchSerialList.forEach((item) => {
      /* this obj. must be reset for each item or the 1st item's values got inserted in the place of other items
       * resulting in below error
       *   "Cannot add row without complete selection of batch/serial numbers"
       */
      batchORSerialNumber = {};
      batchORSerialNumber.BaseLineNumber = item.BaseLineNumber;
      batchORSerialNumber.Quantity = item.Quantity;

      if (itemType === "Batch") {
        batchORSerialNumber.BatchNumberProperty = item.BatchNumberProperty;
        batchORSerialNumber.BatchNumber = item.BatchNumber;
      } else if (itemType === "Serial") {
        batchORSerialNumber.InternalSerialNumber = item.InternalSerialNumber;
      }
      batchORSerialNumbersList.push(batchORSerialNumber);
    });
  }
  return batchORSerialNumbersList;
};

/**
 * Returns the BinAllocation info from draft
 * @param {*} draftBinAllocationList
 */
const getBinAllocationDetails = (draftBinAllocationList) => {
  let binAllocationList = [],
    binAllocation = {};
  draftBinAllocationList.forEach((bin) => {
    binAllocation = {
      BinAbsEntry: bin.BinAbsEntry,
      Quantity: bin.Quantity,
      BaseLineNumber: bin.BaseLineNumber,
      SerialAndBatchNumbersBaseLine: bin.SerialAndBatchNumbersBaseLine,
    };
    binAllocationList.push(binAllocation);
    binAllocation = {};
  });
  return binAllocationList;
};

/**
 * Create a Delivery from Draft
 * @param {*} draft
 * @param {*} draftDocEntry
 * @param {*} cookie
 * @returns
 */
exports.createDeliveryFromDraft = async (draft, draftDocEntry, cookie) => {
  serviceLayerAPI.defaults.headers.Cookie = cookie;
  try {
    /** 'DraftsService_SaveDraftToDocument' API doesnt seem to carryforward BatchNumbers from Draft to Delivery,
     * also BatchNumbers are gettging removed form Draft rec. too, once a Delivery is created with that Draft
     * so I'm using below logic to get all the data from Draft and send it to Delivery api
     *
    const deliveryResp = await serviceLayerAPI.post(`DraftsService_SaveDraftToDocument`, 
    { Document: {DocEntry: request.DocEntry} });
    */

    console.log("draft: " + JSON.stringify(draft));
    let documentLines = [],
      docLine = {},
      documentAdditionalExpenses = [];
    const docCurrency = draft.DocCurrency;

    if (Array.isArray(draft.DocumentLines) && draft.DocumentLines.length) {
      draft.DocumentLines.forEach((line) => {
        docLine = {
          LineNum: line.LineNum,
          LocationCode: line.LocationCode,
          ItemCode: line.ItemCode,
          Quantity: line.Quantity,
          BaseType: line.BaseType,
          BaseEntry: line.BaseEntry,
          BaseLine: line.BaseLine,
          MeasureUnit: line.MeasureUnit,
          WarehouseCode: line.WarehouseCode,
        };
        docLine.BatchNumbers = getBatchSerialList("Batch", line.BatchNumbers);
        docLine.SerialNumbers = getBatchSerialList("Serial", line.SerialNumbers);

        //Added to fix "Fully allocate item XXXX to Bin location in Warehouse YYYY"
        // docLine.DocumentLinesBinAllocations = getBinAllocationDetails(line.DocumentLinesBinAllocations),
        // docLine.DocumentLinesBinAllocations = cloneDeep(line.DocumentLinesBinAllocations),

        //sort the BinAllocation recs. in ASC order based on 'SerialAndBatchNumbersBaseLine'
        //Tried sorting the recs. hoping that it would fix Invalid "SerialAndBatchNumbersBaseLine" err.
        //BUT it DIDN'T
        ((docLine.DocumentLinesBinAllocations = cloneDeep(
          line.DocumentLinesBinAllocations.sort(
            (a, b) => a.SerialAndBatchNumbersBaseLine - b.SerialAndBatchNumbersBaseLine,
          ),
        )),
          documentLines.push(docLine));
      });
    }
    //sort the items (in asc order) based on BaseLine or
    documentLines.sort((a, b) => a.BaseLine - b.BaseLine);

    if (
      Array.isArray(draft.DocumentAdditionalExpenses) &&
      draft.DocumentAdditionalExpenses.length
    ) {
      draft.DocumentAdditionalExpenses.forEach((freight) => {
        documentAdditionalExpenses.push({
          LineNum: freight.LineNum,
          ExpenseCode: freight.ExpenseCode,
          //sending this value converts amount into Local Curr. & saves in LineTotal, which is incorrect
          //LineTotal: freight.LineTotal,
          LineTotal: docCurrency === systemCurrency ? freight.LineTotal : freight.LineTotalFC,
        });
      });
    }

    const deliveryRequest = {
      //set the Default BranchID if the Draft's BranchID is not set
      // BPL_IDAssignedToInvoice: draft.BPL_IDAssignedToInvoice
      //                           ? draft.BPL_IDAssignedToInvoice : 1, //BranchID
      DocDate: draft.DocDate,
      DocDueDate: draft.DocDueDate,
      CardCode: draft.CardCode,
      CardName: draft.CardName,
      Address: draft.Address,
      NumAtCard: draft.NumAtCard,
      //DocTotal: draft.DocTotal, //sending this leads to miscalculation in the created Delivery

      // DocTotalFc: draft.DocTotalFc,
      // DocTotalSys: draft.DocTotalSys,
      DocCurrency: docCurrency,
      DocRate: draft.DocRate,
      Reference1: draft.Reference1,
      Reference2: draft.Reference2,
      Comments: draft.Comments,
      DocObjectCode: draft.DocObjectCode,
      CreationDate: draft.CreationDate,
      DocTime: draft.DocTime,
      UpdateDate: draft.UpdateDate,
      UpdateTime: draft.UpdateTime,
      VatPercent: draft.VatPercent,
      VatSum: draft.VatSum,
      //VatSumSys: draft.VatSumSys,
      //VatSumFc: draft.VatSumFc,
      DiscountPercent: draft.DiscountPercent,
      //TotalDiscount: draft.TotalDiscount, //this was working for POs with Foreign Curr.
      // but wanted to try how the below works
      TotalDiscount: docCurrency === systemCurrency ? draft.TotalDiscount : draft.TotalDiscountFC,
      // TotalDiscountFC: draft.TotalDiscountFC,
      // TotalDiscountSC: draft.TotalDiscountSC,
      U_OriginatorId: draft.U_OriginatorId,
      //NOTE:
      //this value from draftResp. will be NULL as Drafts no longer save their Approver info in
      //U_ApproverId field, but in a separate UDT, ApprovalStatus (to accomodate Multi-level Approval
      //info). Though it is not required, removing it from the Delivery Request thorws "Socket Hang up" error
      //when an Approver approves a Draft
      U_ApproverId: draft.U_ApproverId,
      U_DraftStatus: draft.U_DraftStatus,
      U_MultiLevelApproval: draft.U_MultiLevelApproval,
      U_NoOfApprovals: parseInt(draft.U_NoOfApprovals, 10),
      U_DraftDocEntry: draftDocEntry, //Base Draft's DocEntry
      DocumentLines: documentLines,
      DocumentAdditionalExpenses: documentAdditionalExpenses,
    };
    if (draft.BPL_IDAssignedToInvoice) {
      deliveryRequest.BPL_IDAssignedToInvoice = draft.BPL_IDAssignedToInvoice;
    }

    console.log("***deliveryRequest: " + JSON.stringify(deliveryRequest));
    const deliveryResponse = await serviceLayerAPI.post(serviceLayerURI, deliveryRequest);
    // console.log("***deliveryResponse: "+ deliveryResponse);

    return deliveryResponse;
  } catch (error) {
    let status = draftStatus.PENDING;

    const resetDraftStatus = await serviceLayerAPI.patch(`Drafts(${draftDocEntry})`, {
      U_DraftStatus: status,
    });
    console.log("resetDraftStatus - response.data: " + resetDraftStatus);
    throw error;
  }
};

/**
 *
 * @param {JSON}   request Delivery Draft request payload
 * //param {Object} res     Response obj. to send back the response
 * @param {String} approvalStatus Status to be set to APPROVALSTATUS table
 * @param {*} cookie
 * @param {String} multiLevelApproval 'Y' or 'N'
 */

const updateDraftAndNotifyOriginator = async (
  request,
  approvalStatus,
  cookie,
  multiLevelApproval,
) => {
  const approvalLevel = !isNaN(request.U_ApprovalLevel) ? parseInt(request.U_ApprovalLevel) : 0;
  try {
    const draftDocEntry = request.DocEntry;
    console.log("updateDraftAndNotifyOriginator: " + JSON.stringify(request));
    let deliveryResponse;

    serviceLayerAPI.defaults.headers.Cookie = cookie;
    //All we need to `patch` is Comments & DraftStatus, no need to send the whole `request` to below api
    const response = await serviceLayerAPI.patch(
      `Drafts(${draftDocEntry})`, //request
      { Comments: request.Comments, U_DraftStatus: request.U_DraftStatus },
    );
    console.log("PATCH Draft - response.data: " + JSON.stringify(response.data));

    //if the Draft is APPROVED, create a Delivery using the Draft
    if (request.U_DraftStatus == draftStatus.APPROVED) {
      // let draftResponse = await serviceLayerAPI.get(`Drafts(${draftDocEntry})`);
      let draftResponse = await serviceLayerDraftHelper.getDraft(draftDocEntry, serviceLayerAPI);

      if (draftResponse) {
        deliveryResponse = this.createDeliveryFromDraft(draftResponse, draftDocEntry, cookie);
      }
    }

    if (response || deliveryResponse) {
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
        draftApprovalsHelper.setApprovalStatus(approvalStatus, draftDocEntry);
      }

      //Set TargetRecDocNum when a draft is Approved
      if (deliveryResponse) {
        console.log("deliveryResponse.data.DocNum: " + deliveryResponse.data.DocNum);
        console.log(
          "deliveryResponse.data.DocumentLines: " +
            JSON.stringify(deliveryResponse.data.DocumentLines),
        );

        const result = draftHelper.updateDraft(
          { U_TargetRecDocNum: deliveryResponse.data.DocNum },
          { DocEntry: draftDocEntry },
        );

        //Set the status of other Approvers as GENERATED when a Target Rec. is created from a Draft
        //NOTE: This is not applicable when Multi-level Approval setup is enabled
        if (multiLevelApproval !== "Y") {
          draftApprovalsHelper.setApprovalStatus(draftStatus.APPROVED, draftDocEntry);
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
          moduleName,
          originatorRec[0].UserName,
          approverRec[0].UserName,
          draftDocEntry,
          status,
        );
        sendMail(originatorRec[0].Email, approveRejectNotification.subject, mailBody);
      }

      let noOfDays;
      //get the No. of Days b/w Creation Date (or prev. Approval Date) & the Draft Creation Date
      if (approvalStatus === draftStatus.APPROVED) {
        noOfDays = draftApprovalsHelper.getApprovalInternalInDays(
          draftDocEntry,
          request.U_ApprovalLevel,
          multiLevelApproval,
        );
      }

      //send the response back to front end
      /*res.status(200).send({
        draftStatus: status,
        noOfDays
        //deliveryResponse //this was throwing TypeError: Converting circular structure to JSON
        //deliveryResponse : deliveryResponse.data //this is not required now, bcoz this data is not used in the UI, DeliveryDraftItemDetails.js
      });*/
      return { draftStatus: status, noOfDays };
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Updates the Draft rec. with the new set of data passed & perform operations based on the
 * Draft's Status
 * @param {*} request
 * @param {*} cookie
 * @returns { draftStatus, noOfDays }
 */
exports.updateDeliveryDraft = async (request, cookie) => {
  console.log(`request: ${JSON.stringify(request)}`);

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
          draftObjectCodes[moduleName],
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

          const response = await updateDraftAndNotifyOriginator(
            request,
            approvalStatus,
            cookie,
            multiLevelApproval,
          );

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
                moduleName,
                originatorRec[0].UserName,
                request.DocEntry,
              );
              sendMail(nextApproverDetails[0].Email, newRequestNotification.subject, mailBody);
            }
          }
          return response;
        } else {
          /* NOTE: Uncommented this part for Multiple approvers setup in same level.
          This check is not even required for non-Multilevel approvals. Bcoz it is just going to be ONE approval
          anyway. */

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
          const response = await updateDraftAndNotifyOriginator(
            request,
            approvalStatus,
            cookie,
            multiLevelApproval,
          );
          return response;
        }
      }
      //Do nothing if the status is REJECTED. This will set the Draft status as REJECTED
      //NOTE: Using "strict equality" (===) DIDN'T Work here
      else if (request.U_DraftStatus == draftStatus.REJECTED) {
        console.log("****REJECTED");
        const response = await updateDraftAndNotifyOriginator(request, approvalStatus, cookie);
        return response;
      }
    } catch (error) {
      console.log("Delivery Draft error: " + error);
      throw error;
    }
  } else {
    throw new Error("Unable to connect to the server. Please contact Administrator!");
  }
};

/**
 * Gets the 'Rows' from Delivery/ Delivery Draft
 * @param {*} type      Delivery("direct") or Delivery Draft ("draft")
 * @param {*} filters
 * @param {*} cookie
 * @param {*} includeFreightInfo  Will be FALSE when this funct. is called from qc-inspection.controller
 *                                 as Flight Info is not required there
 * @returns
 */
exports.getDeliveryDraft = async (type, filters, cookie, includeFreightInfo = true) => {
  if (cookie) {
    serviceLayerAPI.defaults.headers.Cookie = cookie;
    try {
      let response;
      if (type === recordTypes.DRAFT) {
        response = await serviceLayerAPI.get(`Drafts(${filters.docEntry})`); //?$select=DocEntry,DocNum,DocDate,CardCode,CardName,Comments,DocumentLines
      } else if (type === recordTypes.DIRECT) {
        response = await serviceLayerAPI.get(`${serviceLayerURI}(${filters.docNum})`); //?$select=DocEntry,DocNum,DocDate,CardCode,CardName,Comments,DocumentLines
      }

      if (includeFreightInfo) {
        console.log("response.data: " + JSON.stringify(response.data));
        //Get all Freight Names & their code
        let allFreightInfo = dbHelper.executeWithValues(query.allFreightInfo, []);

        //Get Freight details for the Draft
        let freightInfoForDraft = response.data.DocumentAdditionalExpenses.slice();

        //Add FreightName to all the Freight rec.
        if (Array.isArray(freightInfoForDraft) && freightInfoForDraft.length) {
          allFreightInfo.forEach((freight) => {
            freightInfoForDraft.forEach((freightPO) => {
              if (freight.FreightCode == freightPO.ExpenseCode) {
                freightPO.FreightName = freight.FreightName;
              }
            });
          });
        }
        if (response.data) {
          //res.send({ draft: response.data });
          return {
            draft: response.data,
            draftStatus: response.data.U_DraftStatus, //will be used to show/hide View QR Code btn for Approvers
            //DocumentLines: response.data.DocumentLines,
            freightInfoForDraft,
            DocTotal: response.data.DocTotal,
            DocTotalFc: response.data.DocTotalFc,
          };
        } else {
          console.log("Failed to get Delivery Request details!.. Error-500");
          return;
        }
      } else {
        return response.data;
      }
    } catch (error) {
      console.log("Delivery Draft error: " + error);
      throw error;
    }
  } else {
    throw { message: "Unable to connect to the server. Please contact Administrator!" };
  }
};

// module.exports = { createDelivery, createDeliveryDraft, updateDeliveryDraft, getDeliveryDraft };
