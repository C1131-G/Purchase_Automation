const { serviceLayerAPI } = require("../config/service-layer-api");
const { portalModules, serviceLayerApiURIs, attachmentPath } = require("../config/config");
const helper = require("../helper/invoice.js");

const moduleName = portalModules.INVOICE;
const serviceLayerURI = serviceLayerApiURIs[moduleName];
const attachServiceLayerURI = portalModules.ATTACHMENTS;
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const multer = require("multer");

// Multer setup to handle image file upload
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ storage: storage });

/**
 * HELPER: Check if Transaction ID already exists in SAP
 */
const checkDuplicateTransaction = async (transactionID, cookie) => {
  try {
    if (!transactionID) return { exists: false };
    console.log(`[Duplicate Check] Verifying ID in SAP: ${transactionID}`);
    serviceLayerAPI.defaults.headers.Cookie = cookie;

    const filter = `$filter=U_POS_TransactionID eq '${transactionID}'&$select=DocNum,DocEntry`;
    const url = `${serviceLayerURI}?${filter}`;

    const response = await serviceLayerAPI.get(url);

    if (response?.data?.value?.length > 0) {
      const existingDoc = response.data.value[0];
      console.log(`[Duplicate Check] Found existing Invoice #${existingDoc.DocNum}`);
      return { exists: true, docNum: existingDoc.DocNum };
    }
    return { exists: false };
  } catch (err) {
    console.error("[Duplicate Check] Error querying SAP:", err.message);
    return { exists: false };
  }
};

exports.createInvoice = async (request, cookie) => {
  try {
    /**
     * STEP A: Extract Transaction ID
     */
    const transactionID =
      request.U_POS_TransactionID || (request.invoice && request.invoice.U_POS_TransactionID);

    /**
     * STEP B: Duplicate check
     */
    if (transactionID) {
      const check = await checkDuplicateTransaction(transactionID, cookie);
      if (check.exists) {
        console.warn(`*** DUPLICATE BLOCKED: Transaction ${transactionID}`);
        return {
          isExist: true,
          success: false,
          message: `Duplicate Transaction! Invoice #${check.docNum} already exists.`,
          DocNum: check.docNum,
          DocEntry: check.docEntry, // Return DocEntry so frontend can still view it if needed
        };
      }
    }

    console.log("*** Invoice request: " + JSON.stringify(request));
    serviceLayerAPI.defaults.headers.Cookie = cookie;

    /**
     * STEP C: Inject into UserFields for SAP
     */
    if (transactionID) {
      request.UserFields = request.UserFields || {};
      request.UserFields.U_POS_TransactionID = transactionID;
    }

    const response = await serviceLayerAPI.post(serviceLayerURI, request);

    if (response.data) {
      return response.data;
    }
    return;
  } catch (error) {
    console.log("Create Invoice error: " + error);
    throw error;
  }
};

exports.updateInvoice = async (request, cookie) => {
  try {
    console.log("*** Invoice request: " + JSON.stringify(request));
    serviceLayerAPI.defaults.headers.Cookie = cookie;
    const response = await serviceLayerAPI.patch(
      `${serviceLayerURI}(${request.DocEntry})`,
      request,
    );
    if (response && response.status === 204) {
      return { message: "Invoice updated successfully.", status: 200 };
    }
    return { message: "Unexpected response from server.", status: response.status };
  } catch (error) {
    console.error("Create Invoice error:", error.message);
    throw error;
  }
};

exports.updateInvoiceAttachment = async (request, cookie) => {
  try {
    if (!request.file) {
      return { message: "Invoice Attachment: No file uploaded!", status: 200, success: false };
    }
    serviceLayerAPI.defaults.headers.Cookie = cookie;
    const imageBuffer = request.file.buffer;
    const originalName = request.file.originalname;

    const fileExtension = path.extname(originalName).replace(".", "");
    const fileName = path.basename(originalName, "." + fileExtension);

    const source_dir = path.join(attachmentPath, "assets/attachment");
    if (!fs.existsSync(source_dir)) {
      fs.mkdirSync(source_dir, { recursive: true });
    }
    const fullFilePath = path.join(source_dir, originalName);
    fs.writeFileSync(fullFilePath, imageBuffer);

    const att_pdf = {
      Attachments2_Lines: [
        {
          FileExtension: fileExtension,
          SourcePath: source_dir.replace(/\\/g, "/"),
          UserID: request.session.userId,
          FileName: fileName,
        },
      ],
    };
    const invoiceData = await helper.getAttachmentEntry(request.body.DocEntry);
    let response = {};
    let absEntry;

    if (invoiceData && invoiceData?.AtcEntry !== null) {
      absEntry = invoiceData?.AtcEntry;
      response = await serviceLayerAPI.patch(`${attachServiceLayerURI}(${absEntry})`, att_pdf);
      if (response && response.status === 204) {
        return { message: "Invoice Attachment updated successfully.", status: 200 };
      }
    } else {
      response = await serviceLayerAPI.post(attachServiceLayerURI, att_pdf);
      if (response.data) {
        absEntry = response.data.AbsoluteEntry;
        const reqInvoice = { AttachmentEntry: absEntry };
        const invResponse = await serviceLayerAPI.patch(
          `${serviceLayerURI}(${request.body.DocEntry})`,
          reqInvoice,
        );
        if (invResponse && invResponse.status === 204) {
          return { message: "Invoice Attachment updated successfully.", status: 200 };
        }
      }
    }
    return { message: "Unexpected response from server.", status: response.status };
  } catch (error) {
    console.error("Invoice Attachment upload error:", error.response?.data || error.message);
  }
};

module.exports.upload = upload;
