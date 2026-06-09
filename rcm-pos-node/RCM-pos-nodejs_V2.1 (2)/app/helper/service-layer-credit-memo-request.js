const { serviceLayerAPI } = require("../config/service-layer-api");
const { portalModules, serviceLayerApiURIs } = require("../config/config");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

/* ------------------------------------------------------------------ */
/* CONFIG                                                             */
/* ------------------------------------------------------------------ */
const moduleName = portalModules.CREDIT_MEMO_REQUEST;
const serviceLayerURI = serviceLayerApiURIs[moduleName];
const attachServiceLayerURI = serviceLayerApiURIs[portalModules.ATTACHMENTS] || "/Attachments2";

const NODE_WRITE_PATH = "\\\\172.26.60.17\\Attachments\\";
const SAP_READ_PATH = "D:\\Attachments\\";

/* ------------------------------------------------------------------ */
/* MULTER                                                             */
/* ------------------------------------------------------------------ */
const storage = multer.memoryStorage();
const upload = multer({ storage });

/* ------------------------------------------------------------------ */
/* INVOICE HELPERS                                                    */
/* ------------------------------------------------------------------ */

/**
 * Reopens an invoice.
 * If SAP version doesn't support it, it catches the error and continues.
 */
exports.reopenInvoice = async (cookie, docEntry) => {
  try {
    return await serviceLayerAPI.post(
      `/Invoices(${docEntry})/Reopen`,
      {},
      { headers: { Cookie: cookie } },
    );
  } catch (error) {
    const msg = error.response?.data?.error?.message?.value || error.message;
    console.warn(`[Warning] Could not Reopen Invoice ${docEntry}: ${msg}`);
    // Return null instead of throwing so the process can attempt to continue
    return null;
  }
};

/**
 * Closes an invoice.
 * If SAP version doesn't support it, it catches the error and continues.
 */
exports.closeInvoice = async (cookie, docEntry) => {
  try {
    return await serviceLayerAPI.post(
      `/Invoices(${docEntry})/Close`,
      {},
      { headers: { Cookie: cookie } },
    );
  } catch (error) {
    const msg = error.response?.data?.error?.message?.value || error.message;
    console.warn(`[Warning] Could not Close Invoice ${docEntry}: ${msg}`);
    return null;
  }
};

/* ------------------------------------------------------------------ */
/* ATTACHMENT HELPER                                                  */
/* ------------------------------------------------------------------ */
exports.createAttachment = async (file, cookie) => {
  try {
    serviceLayerAPI.defaults.headers.Cookie = cookie;

    if (!fs.existsSync(NODE_WRITE_PATH)) {
      throw new Error("UNC path not accessible: " + NODE_WRITE_PATH);
    }

    const parsed = path.parse(file.originalname);
    const fileNameOnly = parsed.name.replace(/[^a-zA-Z0-9]/g, "_");
    const fileExtension = parsed.ext.replace(".", "").toLowerCase();

    if (!fileExtension) {
      throw new Error("File extension missing");
    }

    const physicalName = `${fileNameOnly}.${fileExtension}`;
    const fullWritePath = path.join(NODE_WRITE_PATH, physicalName);

    fs.writeFileSync(fullWritePath, file.buffer);
    console.log(`[OK] File written to UNC: ${fullWritePath}`);

    const payload = {
      Attachments2_Lines: [
        {
          SourcePath: SAP_READ_PATH,
          FileName: fileNameOnly,
          FileExtension: fileExtension,
        },
      ],
    };

    const response = await serviceLayerAPI.post(attachServiceLayerURI, payload);

    return response.data.AbsoluteEntry;
  } catch (error) {
    const detail = error.response?.data?.error?.message?.value || error.message;
    console.error("[Attachment Error]:", detail);
    throw new Error(detail);
  }
};

/* ------------------------------------------------------------------ */
/* CREDIT MEMO REQUEST                                                */
/* ------------------------------------------------------------------ */
exports.createCreditMemoRequest = async (request, cookie) => {
  try {
    serviceLayerAPI.defaults.headers.Cookie = cookie;
    const response = await serviceLayerAPI.post(serviceLayerURI, request);
    return response.data;
  } catch (error) {
    throw error;
  }
};

module.exports.upload = upload;
