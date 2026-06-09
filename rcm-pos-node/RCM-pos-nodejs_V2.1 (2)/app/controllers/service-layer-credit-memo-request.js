const { getSLConnection } = require("../helper/service-layer-login.js");
const serviceLayerHelper = require("../helper/service-layer-credit-memo-request.js");
const invoiceHelper = require("../helper/invoice.js");

const create = async (req, res, next) => {
  let wasReopened = false;
  let baseInvoiceEntry = null;
  let cookie = null;

  try {
    // 🔹 1. Parse Data
    const salesReturnData = JSON.parse(req.body.salesReturnData);
    let creditMemoRequest = salesReturnData[0] || {};
    let invoiceUpdateRequest = salesReturnData[1] || [];

    const attachmentFile = req.file;

    // 🔹 2. Login
    cookie = await getSLConnection(req);
    if (!cookie) throw new Error("Session Login Failed");

    // 🔹 3. Identify Base Invoice and Map Lines
    baseInvoiceEntry = invoiceUpdateRequest?.[0]?.DocEntry;
    if (!baseInvoiceEntry) throw new Error("Base Invoice DocEntry is missing");

    creditMemoRequest.DocumentLines = creditMemoRequest.DocumentLines.map((line, index) => {
      const original = invoiceUpdateRequest[index];
      return {
        BaseType: 13,
        BaseEntry: baseInvoiceEntry,
        BaseLine: original ? original.LineNum : index,
        Quantity: line.Quantity,
        WarehouseCode: line.WarehouseCode,
        U_ReturnReason: line.U_ReturnReason,
      };
    });

    // 🔹 4. Status Check & Defensive Reopen
    const invoiceData = await invoiceHelper.getInvoiceByDocEntry(baseInvoiceEntry, req);
    if (invoiceData?.DocumentStatus === "bost_Close" || invoiceData?.DocumentStatus === "C") {
      console.log(`[Status] Invoice ${baseInvoiceEntry} is closed. Reopening...`);
      await serviceLayerHelper.reopenInvoice(cookie, baseInvoiceEntry);
      wasReopened = true;
    }

    // 🔹 5. Handle Attachment (Binary Method)
    if (attachmentFile) {
      const attachmentEntry = await serviceLayerHelper.createAttachment(attachmentFile, cookie);
      if (attachmentEntry) {
        creditMemoRequest.AttachmentEntry = attachmentEntry;
      }
    }

    // 🔹 6. Create the Document
    const response = await serviceLayerHelper.createCreditMemoRequest(creditMemoRequest, cookie);

    // 🔹 7. Restore Status
    if (wasReopened) {
      console.log(`[Status] Restoring Invoice ${baseInvoiceEntry} to closed.`);
      await serviceLayerHelper.closeInvoice(cookie, baseInvoiceEntry);
    }

    // 🔹 8. Update Local Quantities
    if (invoiceUpdateRequest.length > 0) {
      await invoiceHelper.updateRemainingQuantity(invoiceUpdateRequest);
    }

    res.status(200).send({ DocNum: response.DocNum, DocEntry: response.DocEntry });
  } catch (error) {
    const msg = error.response?.data?.error?.message?.value || error.message;
    console.error("!!! FINAL ERROR !!!: " + msg);

    // Cleanup: If we opened the invoice but failed later, close it back.
    if (wasReopened && baseInvoiceEntry && cookie) {
      try {
        await serviceLayerHelper.closeInvoice(cookie, baseInvoiceEntry);
      } catch (e) {}
    }
    res.status(500).json({ message: msg });
  }
};

module.exports = { create };
