/**
 * SAMPLE - NOT Required for POS
 */

const { In } = require("typeorm");
const { getSLConnection } = require("../helper/service-layer-login");
const { sendMail } = require("../helper/send-mail");
const newRequestNotification = require("../mail-templates/new-request-notification");
const dbHelper = require("../helper/db");
const query = require("../config/hana-db");
const { portalModules, draftStatus, draftObjectCodes } = require("../config/config");
const { getRandomNo, formatDate } = require("../utils/utils");
const serviceLayerDeliveryHelper = require("../helper/service-layer-delivery");
const userHelper = require("../helper/users");

const { logger } = require("../services/logger");
// const bunyanLogger = logger.init();

const draftApprovalsHelper = require("../helper/draft-approvals");
const moduleName = portalModules.DELIVERY;

const create = async (req, res, next) => {
  try {
    const originatorId = req.session.userId;
    req.body.userId = req.session.userId;
    const approverRec = draftApprovalsHelper.getApprovers(originatorId, moduleName);

    const cookie = await getSLConnection(req);
    if (Array.isArray(approverRec) && approverRec.length > 0) {
      const response = await handleDraftCreation(req.body, approverRec, cookie);
      res.status(200).send(response);
    } else {
      const response = await serviceLayerDeliveryHelper.createDelivery(req.body, cookie);
      res.status(200).send({ docNum: response.DocNum });
    }
  } catch (error) {
    console.log("create Delivery: " + JSON.stringify(error));
    // res.status(500).send({ message: error.message });
    // const { statusCode, message } = serviceLayerErrorHandler(error);
    // res.status(statusCode).json({ message });
    next(error);
  }
};

const handleDraftCreation = async (request, approverRec = [], cookie) => {
  try {
    const originatorId = request.userId;
    const response = await serviceLayerDeliveryHelper.createDeliveryDraft(
      request,
      approverRec,
      cookie,
    );
    if (response.draftNum) {
      let approversList = [];
      approverRec.forEach((approver) => {
        approversList.push(approver.UserName);
      });

      if (approversList.length > 0) {
        //Create Approver recs. in Draft APPROVALSTATUS table
        const { draftApproverRec, mailingList } =
          await draftApprovalsHelper.createApproversForDraft(
            response.draftNum,
            approverRec,
            moduleName,
          );

        //send mail notification to the Approvers if the Draft has been saved successfully
        if (draftApproverRec) {
          const originatorRec = userHelper.getUserInfo(originatorId);

          await draftApprovalsHelper.notifyApprovers(
            moduleName,
            originatorRec.UserName,
            response.draftNum,
            mailingList,
          );
        }
      }
      return {
        draftNum: response.draftNum,
        approverName: approversList.length > 0 ? approversList.join(", ") : "",
      };
    }
    return;
  } catch (err) {
    throw err;
  }
};

/**
 * Updates a Delivery Draft & creates new `Delivery` with the same Draft (if Approved)
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const update = async (req, res, next) => {
  console.log(`req.body: ${JSON.stringify(req.body)}`);
  req.body.userId = req.session.userId;
  try {
    const cookie = await getSLConnection(req);
    const { draftStatus, noOfDays } = await serviceLayerDeliveryHelper.updateDeliveryDraft(
      req.body,
      cookie,
    );
    res.status(200).send({ draftStatus, noOfDays });
  } catch (error) {
    console.log("Delivery Draft error: " + error);
    next(error);
  }
};

const get = async (req, res, next) => {
  console.log(`get Delivery - req.params: ${JSON.stringify(req.params)}`);
  if (req.query.docEntry || req.query.docNum) {
    try {
      const cookie = await getSLConnection(req);
      const result = await serviceLayerDeliveryHelper.getDeliveryDraft(
        req.params.type,
        req.query,
        cookie,
      );
      if (result) {
        res.send(result);
      } else {
        res.status(500).json({ message: "Failed to get Delivery Request details!" });
      }
    } catch (error) {
      console.log("Delivery Draft error: " + error);
      next(error);
    }
  } else {
    res.status(500).send({ error: "Invalid DocEntry!" });
  }
};

module.exports = { create, update, get };
