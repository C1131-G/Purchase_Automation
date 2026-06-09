import moment from "moment";
import { formatDate, getValidNumber, round } from "../../config/util.js";
import { createInvoice } from "../../helper/invoice.js";
import {
  countryCode,
  statusColors,
  customerTypes,
  portalModules,
  DEFAULT_BRANCH_ID,
  PAYMENT_METHODS,
  CASH_BANK_ACCOUNT_CODE,
  isHomeDeliveryEnabled,
} from "../../config/config.js";
import { roundPrice } from "../common-utils/calculations.util.js";

/**
 * Prepare `header` payload for Invoice & Sales Quotation
 * @param {*} cardCode
 * @param {*} dueAmount
 * @param {*} headerRecord
 * @param {*} rowRecords
 * @param {*} customerAddress
 * @param {*} isCODCustomer
 * @param {*} oneTimeCustomerDetails
 * @param {*} storeLocation
 * @returns
 */
export const getInvoiceSQRequest = (
  cardCode,
  dueAmount,
  headerRecord,
  rowRecords,
  customerAddress,
  isCODCustomer,
  oneTimeCustomerDetails,
  storeLocation,
  branch,
  counterName,
  userName,
) => {
  const request = {
    invoice: {
      CardCode: cardCode,
      Comments: `${
        headerRecord.Comments ? headerRecord.Comments + ". " : ""
      }${storeLocation} - Created via POS`,
      // DocDate: POSTING_DATE, // Adding this to payload posts prev. Date to SAP
      // ShipToCode: "TestAddress ID",
      SalesPersonCode: headerRecord.SalesPersonCode,
      NumAtCard: headerRecord.NumAtCard,
      JournalMemo: headerRecord.NumAtCard,
      //DocTotal: dueAmount,
      // PriceMode: 1,
      // DocTotalSys: dueAmount,
      // PaymentGroupCode: 1, //Commented to fix Invalid value  [OINV.GroupNum]
      BPL_IDAssignedToInvoice: branch ? branch : DEFAULT_BRANCH_ID,
      U_Location: storeLocation,
      U_PaymentType: "",
      U_CODCntName: oneTimeCustomerDetails.U_CODCntName,
      U_CODTlePhone: oneTimeCustomerDetails.U_CODTlePhone,
      U_CODEmail: oneTimeCustomerDetails.U_CODEmail,
      U_CODAddress: isCODCustomer ? oneTimeCustomerDetails.U_CODAddress : "",
      U_License: isCODCustomer ? oneTimeCustomerDetails.U_License : "",
      U_FNPFNO: isCODCustomer ? oneTimeCustomerDetails.U_FNPFNO : "",
      U_TINNO: isCODCustomer ? oneTimeCustomerDetails.U_TINNO : "",
      U_VoterID: isCODCustomer ? oneTimeCustomerDetails.U_VoterID : "",
      U_IsHomeDelivery: isHomeDeliveryEnabled && isCODCustomer ? "Y" : "N",
      //U_DeliveryAgentId: isCODCustomer ?  headerRecord.U_DeliveryAgentId : null,
      U_DeliveryStatus: isCODCustomer ? "PENDING" : "PENDING",
      U_IsPaymentReceived: isCODCustomer ? "N" : "N",
      U_Unique: storeLocation + generateUniqueID(),
      U_CreatedBy: userName + " - " + counterName.toUpperCase(),
      AddressExtension: getAddressExtension(customerAddress),
      DocumentLines: getDocumentLines(rowRecords, storeLocation),
    },
  };

  return request;
};

// export const getSalesBatchSelection = (salesItems, timYardTransaction) => {
//   const docLines = salesItems.map((item, itemKey) => {
//     return {
//       // `Base` rec. must be set if available
//       BaseEntry: item.BaseEntry,
//       BaseLine: item.BaseLine,
//       BaseType: item.BaseType,
//       // Original `LineNum` must be set during Edit op.
//       FreeText: item.FreeText,
//       LineNum: isEditOperation ? item.LineNum : itemKey,
//       ItemCode: item.ItemCode,
//       WarehouseCode: item.WhsCode,
//       CostingCode: storeLocation,
//       Quantity: item.Quantity,
//       //Price: item.Price,
//       DiscountPercent: getValidNumber(item.Discount, 0, true),
//       VatGroup: item.VatGroup,
//       TaxPercentagePerRow: item.TaxPercent,
//       //TaxTotal: item.TaxLocal,
//       //LineTotal: item.TotalPrice,

//       BatchNumbers: batchNumbers,
//       SerialNumbers: serialNumbers,
//       DocumentLinesBinAllocations: documentLinesBinAllocations
//     }
//   }
//   let comments = "", request = {};
//   request = {
//     Series: 119,
//     Status: "O",
//     RequestStatus: "W",
//     DataSource: "I",
//     U_ItemCode: timYardTransaction.ItemCode,
//     U_LineNum: timYardTransaction.LineNum,
//     U_InvNo: "",
//     U_Quantity: 1.0,
//     U_TotalQty: timYardTransaction.SelectQty,
//     U_WhsCode: salesItems.WhsCode,
//     SBS1Collection: sbs1data
//   }
// }

export const getSalesBatchSelection = (salesItems, timYardTransaction, salesHeader, isEdit) => {
  const request = [];

  salesItems.forEach((salesItem, index) => {
    const itemTransactions = timYardTransaction[salesItem.ItemCode];
    if (itemTransactions) {
      request.push({
        Status: "O",
        ...(isEdit && { DocEntry: itemTransactions[0].DocEntry || "" }), // Only for edit
        //DocEntry: itemTransactions[0].DocEntry, // Assuming all transactions for the item have the same DocEntry
        RequestStatus: "W",
        DataSource: "I",
        U_ItemCode: salesItem.ItemCode,
        U_LineNum: index + 1, // LineNum is not provided in the example data
        ...(isEdit && { U_InvNo: salesHeader?.DocNum || "" }), // Only for edit
        U_Quantity: 1.0,
        U_TotalQty: salesItem.Quantity,
        U_WhsCode: salesItem.WhsCode,
        SBS1Collection: itemTransactions.map((batch) => ({
          //...batch,
          U_Batch: batch.U_Batch,
          U_Width: batch.U_Width,
          U_Height: batch.U_Height,
          U_Length: batch.U_Length,
          U_AvlQty: batch.U_AvlQty,
          U_BalAvlQty: batch.U_BalAvlQty,
          U_NoOfPcs: batch.U_NoOfPcs,
          U_SelQty: batch.U_SelQty,
          U_AvlPcs: batch.U_AvlPcs,
          U_BalPcs: batch.U_BalPcs,
          // Only for edit mode
          ...(isEdit && {
            DocEntry: batch.DocEntry,
            LineId: batch.LineId,
            VisOrder: batch.VisOrder,
          }),
        })),
      });
    }
  });

  return request;
};

export const getSalesQuotationRequest = (
  cardCode,
  dueAmount,
  headerRecord,
  rowRecords,
  customerAddress,
  isCODCustomer,
  oneTimeCustomerDetails,
  storeLocation,
  branch,
  isEditOperation = false,
) => {
  let comments = "",
    request = {};
  if (isEditOperation) {
    comments = headerRecord.Comments;
    request.DocEntry = headerRecord.DocEntry;
    request.DocNum = headerRecord.DocNum;
  } else {
    // CardCode can't be updated during PATCH op.
    request.CardCode = cardCode;
    comments = `${
      headerRecord.Comments ? headerRecord.Comments + ". " : ""
    }${storeLocation} - Created via POS`;
  }

  request = {
    ...request,
    Comments: comments,
    // DocDate: POSTING_DATE, // Adding this to payload posts prev. Date to SAP
    // ShipToCode: "TestAddress ID",
    SalesPersonCode: headerRecord.SalesPersonCode,
    NumAtCard: headerRecord.NumAtCard,
    JournalMemo: headerRecord.NumAtCard,
    ContactPersonCode: headerRecord.customerContact,
    PaymentGroupCode: headerRecord.paymentTerm,
    DocDate: moment(headerRecord.postingDate).format("YYYY-MM-DD"),
    DocDueDate: moment(headerRecord.expiryDate).format("YYYY-MM-DD"),
    //DocTotal: dueAmount,
    // DocTotalSys: dueAmount,
    // PaymentGroupCode: 1, //Commented to fix Invalid value  [OINV.GroupNum]
    BPL_IDAssignedToInvoice: branch ? branch : DEFAULT_BRANCH_ID,
    U_Location: storeLocation,
    U_PaymentType: "",
    U_CODCntName: oneTimeCustomerDetails.U_CODCntName,
    U_CODTlePhone: oneTimeCustomerDetails.U_CODTlePhone,
    U_CODEmail: oneTimeCustomerDetails.U_CODEmail,
    U_CODAddress: isCODCustomer ? oneTimeCustomerDetails.U_CODAddress : "",
    U_License: isCODCustomer ? oneTimeCustomerDetails.U_License : "",
    U_FNPFNO: isCODCustomer ? oneTimeCustomerDetails.U_FNPFNO : "",
    U_TINNO: isCODCustomer ? oneTimeCustomerDetails.U_TINNO : "",
    U_VoterID: isCODCustomer ? oneTimeCustomerDetails.U_VoterID : "",
    AddressExtension: getAddressExtension(customerAddress),
    DocumentLines: getDocumentLines(rowRecords, storeLocation, isEditOperation),
  };

  return request;
};

export const getParkTransInvoiceRequest = (
  customer,
  salesHeader,
  salesItems,
  customerAddress,
  isCODCustomer,
  oneTimeCustomerDetails,
  isOneTimeCustomer,
  parkedTransaction,
  fromParkTrans,
  timYardTransaction,
) => {
  let request = {};
  let data = {
    customer,
    salesItems,
    salesHeader,
    customerAddress,
    isOneTimeCustomer,
    isCODCustomer,
    oneTimeCustomerDetails,
    parkedTransaction,
    timYardTransaction,
  };

  request = {
    transactionType: fromParkTrans,
    data: data,
  };

  return request;
};

export const getParkTransSalesQuotationRequest = (
  customer,
  salesQuotationHeader,
  salesQuotationItems,
  customerAddress,
  isCODCustomer,
  oneTimeCustomerDetails,
  isOneTimeCustomer,
  parkedTransaction,
  fromParkTrans,
) => {
  let request = {};
  let data = {
    customer,
    salesQuotationItems,
    salesQuotationHeader,
    customerAddress,
    isOneTimeCustomer,
    isCODCustomer,
    oneTimeCustomerDetails,
    parkedTransaction,
  };

  request = {
    transactionType: fromParkTrans,
    data: data,
  };
  return request;
};

/**
 * Prepare DocumentLines payload for Invoice & Sales Quotation
 * @param {*} items
 * @param {*} storeLocation
 * @param {*} isEditOperation
 * @returns
 */
export const getDocumentLines = (items, storeLocation, isEditOperation = false) => {
  if (Array.isArray(items) && items.length > 0) {
    let reqItem = {},
      batchNumbers = [],
      serialNumbers = [],
      documentLinesBinAllocations = [];

    let nextLineNum =
      Math.max(...items.map((line) => Number(line.LineNum)).filter((num) => !isNaN(num))) + 1;

    const docLines = items.map((item, itemKey) => {
      console.log("getDocumentLines - itemKey: ", itemKey, item.LineNum);
      //const existingLineNums = items.map(line => line.LineNum);

      let editItemKey;
      if ((isEditOperation && item.LineNum == null) || item.LineNum == undefined) {
        console.log("getDocumentLines - itemKey exists:", itemKey, item.ItemCode);
        editItemKey = nextLineNum++;
        console.log("getDocumentLines - item.LineNum: ", item.LineNum + " - " + nextLineNum);
        //editItemKey = Math.max(...existingLineNums) + 1;
      }
      console.log("getDocumentLines - itemKey new: ", editItemKey);
      // Reset the arrays for each item
      batchNumbers = [];
      serialNumbers = [];
      documentLinesBinAllocations = [];
      if (item.ManBtchNum === "Y" && Array.isArray(item.BatchNumbers) && item.BatchNumbers.length) {
        item.BatchNumbers.forEach((batch, batchKey) => {
          reqItem = {};

          reqItem.BatchNumber = batch.BatchNumber; //NOTE: the prop is 'BatchNumber'
          reqItem.Quantity = getBinAllocationTotal(batch.DocumentLinesBinAllocations);
          reqItem.BaseLineNumber = itemKey;
          batchNumbers.push(reqItem);

          documentLinesBinAllocations = [
            ...documentLinesBinAllocations,
            ...getBinAllocationInfo(batch.DocumentLinesBinAllocations, itemKey, batchKey),
          ];
        });
      } else if (
        item.ManSerNum === "Y" &&
        Array.isArray(item.SerialNumbers) &&
        item.SerialNumbers.length
      ) {
        item.SerialNumbers.forEach((serial, serialKey) => {
          reqItem = {};
          reqItem.InternalSerialNumber = serial.InternalSerialNumber;
          reqItem.ManufacturerSerialNumber = serial.ManufacturerSerialNumber;
          reqItem.Quantity = getBinAllocationTotal(serial.DocumentLinesBinAllocations);
          reqItem.BaseLineNumber = itemKey;
          serialNumbers.push(reqItem);

          documentLinesBinAllocations = [
            ...documentLinesBinAllocations,
            ...getBinAllocationInfo(serial.DocumentLinesBinAllocations, itemKey, serialKey),
          ];
        });
      }

      console.log("getDocumentLines - item: ", item);

      return {
        // `Base` rec. must be set if available
        BaseEntry: item.BaseEntry,
        BaseLine: item.BaseLine,
        BaseType: item.BaseType,
        // Original `LineNum` must be set during Edit op.
        FreeText: item.FreeText,
        LineNum: isEditOperation ? (item.LineNum != null ? item.LineNum : editItemKey) : itemKey,
        ItemCode: item.ItemCode,
        WarehouseCode: item.WhsCode,
        CostingCode: storeLocation,
        Quantity: item.Quantity,
        //Price: item.Price,  // UnComment for Ajax
        GrossPrice: item.Price, // Comment for Ajax
        PriceAfterVAT: item.TotalPriceWithTax, // Comment for Ajax
        DiscountPercent: getValidNumber(item.Discount, 0, true),
        VatGroup: item.VatGroup,
        TaxPercentagePerRow: item.TaxPercent,
        //TaxTotal: item.TaxLocal,
        //LineTotal: item.TotalPrice,

        BatchNumbers: batchNumbers,
        SerialNumbers: serialNumbers,
        DocumentLinesBinAllocations: documentLinesBinAllocations,
      };
    });
    return docLines;
  }
  return;
};

/**
 * Returns the sum of the Quantities of all the Bin Allocations under a Batch/Serial
 * @param {Array} documentLinesBinAllocations
 */
const getBinAllocationTotal = (documentLinesBinAllocations) => {
  let total = 0; //, lineQty = 0;
  if (
    documentLinesBinAllocations &&
    Array.isArray(documentLinesBinAllocations) &&
    documentLinesBinAllocations.length
  ) {
    documentLinesBinAllocations.forEach((line) => {
      //NOTE: When a Bin is newly added its Qty will be 'blank' this causes the total to
      //bcome NaN, so added below validation
      // lineQty = parseInt(line.Quantity);
      total = total + (isNaN(parseFloat(line.Quantity)) ? 0 : parseFloat(line.Quantity));
    });
  }
  return total;
};

/**
 * Returns array of Bin Allocations for a given Batch/Serial
 * @param {Array} documentLinesBinAllocations
 */
const getBinAllocationInfo = (documentLinesBinAllocations, itemKey, batchSerialKey) => {
  let result = [];
  if (Array.isArray(documentLinesBinAllocations) && documentLinesBinAllocations.length) {
    documentLinesBinAllocations.forEach((line) => {
      result.push({
        BinAbsEntry: line.BinAbsEntry,
        Quantity: parseFloat(line.Quantity),
        // AllowNegativeQuantity: "tNO",
        SerialAndBatchNumbersBaseLine: batchSerialKey,
        BaseLineNumber: itemKey,
        //Below prop. will be saved to Drafts table only for view purpose
        //It will be deleted from the payload that's sent to the Service Layer
        // BinCode: line.BinCode // sending this to Invoice API caused below error,
        // 1470000368 - The quantity allocated to bin locations must be positive
      });
    });
  }
  return result;
};

/**
 *
 * @param {*} customerAddress
 * @returns
 */
export const getAddressExtension = (customerAddress) => {
  if (customerAddress) {
    return {
      ShipToStreet: customerAddress.Street ? customerAddress.Street : "",
      // ShipToStreetNo: customerAddress.Street,
      ShipToBlock: customerAddress.Block ? customerAddress.Block : "",
      ShipToBuilding: customerAddress.Building ? customerAddress.Building : "",
      ShipToCity: customerAddress.City ? customerAddress.City : "",
      ShipToCountry: countryCode,
      ShipToAddressType: customerAddress.AdresType ? customerAddress.AdresType : "",
    };
  }
  return;
};

/**
 * Build Incoming Payment payload & return it
 * @param {*} cardCode Customer CardCode
 * @param {*} dueAmount Total Invoice Amt
 * @param {*} paymentInfo
 * @param {*} storeLocation
 * @returns
 */

export const getIncomingPaymentRequest = (
  cardCode,
  dueAmount,
  paymentAmount,
  paymentInfo,
  storeLocation,
  counterName,
  userName,
  branch,
  change,
  cardPaymentInfo = [],
) => {
  let paymentTypes = [];
  let cashPayment = getValidNumber(paymentInfo?.[PAYMENT_METHODS.Cash]?.amount);
  //let change = cashPayment > 0 ? roundPrice(cashPayment - dueAmount) : "0.00"
  const ipRequest = {
    // DocDate: POSTING_DATE, // Adding this to payload posts prev. Date to SAP
    CardCode: cardCode,
    CardName: userName + " - " + counterName.toUpperCase(), //Comment for AJAX
    Remarks: null,
    BPLID: branch ? branch : DEFAULT_BRANCH_ID,
    U_Location: storeLocation,
    PaymentInvoices: [
      {
        LineNum: 0,
        DocEntry: null, //Invoice DocEntry- will be set in the backend once Invoice is created
        SumApplied: dueAmount,
        AppliedSys: dueAmount,
        DistributionRule: storeLocation,
      },
    ],
  };

  let checkPayment = getValidNumber(paymentInfo?.[PAYMENT_METHODS.Check]?.amount);

  if (checkPayment > 0) {
    ipRequest.PaymentChecks = [
      {
        LineNum: 0,
        // DueDate: POSTING_DATE, // Setting server date in the backend
        CheckSum: dueAmount,
        BankCode: paymentInfo?.[PAYMENT_METHODS.Check]?.BankCode,
        Branch: paymentInfo?.[PAYMENT_METHODS.Check]?.Branch,
        CheckNumber: paymentInfo?.[PAYMENT_METHODS.Check]?.CheckNumber,
        AccounttNum: paymentInfo?.[PAYMENT_METHODS.Check]?.AccounttNum,
        OriginallyIssuedBy: paymentInfo?.[PAYMENT_METHODS.Check]?.OriginallyIssuedBy,
        Endorse: paymentInfo?.[PAYMENT_METHODS.Check]?.Endorse,
        CountryCode: countryCode,
        CheckAccount: "AJAXBS040",
        Branch: storeLocation + " - " + counterName,
        // EndorsableCheckNo: null
      },
    ];
    paymentTypes.push({ type: PAYMENT_METHODS.Check, amount: checkPayment });
  } else {
    //let cashPayment = getValidNumber(paymentInfo?.[PAYMENT_METHODS.Cash]?.amount);
    //let cardPayment = getValidNumber(paymentInfo?.[PAYMENT_METHODS.Card]?.amount);
    let updatedCashAmount = 0;
    //let updatedCheckAmount = 0;
    //let lineNum = 0;
    let isChangeExist = false;
    //ipRequest.PaymentChecks = [];
    // Add the props. required for Cash based Incoming Payment
    if (cashPayment > 0) {
      // Payment was fully done via cash
      // if(cardPayment === 0 && cashPayment > dueAmount) {

      // Cash received was > than the Invoice Amount
      if (cashPayment > dueAmount) {
        cashPayment = dueAmount;
      }

      // Do Not include the amount paid via Card to IP when the payment was fully settled via Cash
      if (cashPayment === dueAmount) {
        //cardPayment = 0;
        cardPaymentInfo = [];
      }
      if (cashPayment < dueAmount) {
        isChangeExist = change > 0 ? true : false;
        if (change > 0 && cashPayment <= change) {
          updatedCashAmount = 0;
          change = round(cashPayment - change, 2);
        } else if (change > 0 && cashPayment > change) {
          updatedCashAmount = round(cashPayment - change, 2);
          change = round(cashPayment - change, 2);
        }
      }

      // Replacing payload below `PaymentChecks` to post `Cash` based IP to `Cheque` account
      // ipRequest.CashSum = cashPayment;
      // ipRequest.CashSumSys = cashPayment;
      // ipRequest.CashAccount = "AJAXBS040"; // seems optional - this value set by default

      ipRequest.PaymentChecks = [
        {
          LineNum: 0,
          // DueDate: POSTING_DATE, // Setting server date in the backend
          CheckSum: cashPayment,
          BankCode: CASH_BANK_ACCOUNT_CODE,
          CountryCode: countryCode,
          Branch: storeLocation + " - " + counterName,
        },
      ];

      paymentTypes.push({ type: PAYMENT_METHODS.Cash, amount: cashPayment });
    }

    // Add the props. required for Card based Incoming Payment
    // if(cardPayment > 0) {
    //   // Payment was fully done via Card
    //   if(cashPayment === 0 && cardPayment > dueAmount) {
    //     cardPayment = dueAmount;
    //   }
    //   /** ELSE block covers all below scenrios **/
    //   // NOT Possible, as the paid Amt is < Invoice Amt validation wont allow to submit the Invoice
    //   // cashPayment === 0 && cardPayment < dueAmount
    //   // cashPayment > 0 && cardPayment > dueAmount
    //   // cashPayment > 0 && cardPayment < dueAmount
    //   // cashPayment > 0 && cardPayment === dueAmount

    //   else {
    //     // Pay the remaining amount (after cash payment) via Card
    //     //const balAmount = dueAmount - cashPayment;
    //     const balAmount = paymentAmount - cashPayment;
    //     if(balAmount > 0) {
    //       cardPayment = balAmount
    //     }
    //   }

    //   ipRequest.PaymentCreditCards = [
    //     {
    //       LineNum: 0,
    //       CreditSum: cardPayment + paymentInfo?.[PAYMENT_METHODS.Card]?.surchargeAmount,
    //       CreditAcct: paymentInfo?.[PAYMENT_METHODS.Card]?.AcctCode, //"AJAXBS001", // seems optional - this value set by default
    //       CreditCard: paymentInfo?.[PAYMENT_METHODS.Card]?.CreditCard, //[PAYMENT_METHODS.Card] Type - Visa / Master
    //       CreditCardNumber: 123,
    //       VoucherNum: paymentInfo?.[PAYMENT_METHODS.Card].VoucherNum, // This is a mandatory field so setting CC# to it
    //       CardValidUntil: formatDate("2025-12-31", "YYYY-MM-DD HH24:MI:SS.FF2"),
    //     }
    //   ];
    //   paymentTypes.push({type: PAYMENT_METHODS.Card, amount: cardPayment });
    //   ipRequest.TransferReference = counterName.length > 20 ? counterName.substring(0, 20) : counterName;
    //   //ipRequest.BankChargeAmount = getValidNumber(paymentInfo?.[PAYMENT_METHODS.Card]?.surchargeAmount);
    // }

    // Multiple Card Payments
    // if (Array.isArray(cardPaymentInfo) && cardPaymentInfo.length > 0) {
    //   // Adjust card payments if needed
    //   let totalCardAmount = cardPaymentInfo.reduce((sum, card) => sum + getValidNumber(card.amount), 0);
    //   let adjustedCardPayments = cardPaymentInfo.map((card, idx) => {
    //     let cardAmount = getValidNumber(card.amount);
    //     // If cash partially paid, adjust card payments to cover the rest
    //     if (cashPayment > 0 && cashPayment < dueAmount) {
    //       const balAmount = paymentAmount - cashPayment;
    //       // Distribute balAmount proportionally if needed
    //       if (totalCardAmount > balAmount) {
    //         cardAmount = Math.round((cardAmount / totalCardAmount) * balAmount * 100) / 100;
    //       }
    //     }
    //     // If cashPayment === dueAmount, this block is skipped above
    //     return {
    //       ...card,
    //       amount: cardAmount
    //     };
    //   });

    //   ipRequest.PaymentCreditCards = adjustedCardPayments.map((card, idx) => ({
    //     LineNum: idx,
    //     CreditSum: getValidNumber(card.amount) + getValidNumber(card.surchargeAmount),
    //     CreditAcct: card.AcctCode,
    //     CreditCard: card.CreditCard,
    //     CreditCardNumber: 123,
    //     VoucherNum: card.VoucherNum,
    //     CardValidUntil: formatDate("2025-12-31", "YYYY-MM-DD HH24:MI:SS.FF2")
    //   }));
    //   adjustedCardPayments.forEach(card => {
    //     paymentTypes.push({ type: PAYMENT_METHODS.Card, amount: card.amount });
    //   });
    //   ipRequest.TransferReference = counterName.length > 20 ? counterName.substring(0, 20) : counterName;
    //          //ipRequest.BankChargeAmount = getValidNumber(card.surchargeAmount);
    // } else {
    //   // Single Card Payment fallback (legacy)
    //   let cardPayment = getValidNumber(paymentInfo?.[PAYMENT_METHODS.Card]?.amount);
    //   if (cardPayment > 0) {
    //     // Payment was fully done via Card
    //     if (cashPayment === 0 && cardPayment > dueAmount) {
    //       cardPayment = dueAmount;
    //     } else {
    //       // Pay the remaining amount (after cash payment) via Card
    //       const balAmount = paymentAmount - cashPayment;
    //       if (balAmount > 0) {
    //         cardPayment = balAmount;
    //       }
    //     }
    //     ipRequest.PaymentCreditCards = [
    //       {
    //         LineNum: 0,
    //         CreditSum: cardPayment + getValidNumber(paymentInfo?.[PAYMENT_METHODS.Card]?.surchargeAmount),
    //         CreditAcct: paymentInfo?.[PAYMENT_METHODS.Card]?.AcctCode,
    //         CreditCard: paymentInfo?.[PAYMENT_METHODS.Card]?.CreditCard,
    //         CreditCardNumber: 123,
    //         VoucherNum: paymentInfo?.[PAYMENT_METHODS.Card]?.VoucherNum,
    //         CardValidUntil: formatDate("2025-12-31", "YYYY-MM-DD HH24:MI:SS.FF2"),
    //         SurchargeAmount: paymentInfo?.[PAYMENT_METHODS.Card]?.surchargeAmount,
    //         SurchargeAccount: paymentInfo?.[PAYMENT_METHODS.Card]?.SurchargeAccount
    //       }
    //     ];
    //     paymentTypes.push({ type: PAYMENT_METHODS.Card, amount: cardPayment });
    //     ipRequest.TransferReference = counterName.length > 20 ? counterName.substring(0, 20) : counterName;
    //   }
    // }
    //rvin-start
    if (Array.isArray(cardPaymentInfo) && cardPaymentInfo.length > 0) {
      // Add each specific card payment to the `paymentTypes` array for the receipt
      cardPaymentInfo.forEach((cardPay) => {
        paymentTypes.push({
          type: cardPay.cardType, // This is the fix: using "VISA", "MASTERCARD", etc.
          amount: cardPay.amount,
        });
      });

      // Build the PaymentCreditCards part of the payload for SAP
      ipRequest.PaymentCreditCards = cardPaymentInfo.map((card, idx) => ({
        LineNum: idx,
        CreditSum: getValidNumber(card.amount) + getValidNumber(card.surchargeAmount),
        CreditAcct: card.AcctCode,
        CreditCard: card.CreditCard, // This is the SAP Card Type Code (e.g., '1', '2')
        CreditCardNumber: 123, // Placeholder, often not required
        VoucherNum: card.reference, // Using the correct 'reference' property
        CardValidUntil: formatDate("2025-12-31", "YYYY-MM-DD HH24:MI:SS.FF2"),
      }));

      ipRequest.TransferReference =
        counterName.length > 20 ? counterName.substring(0, 20) : counterName;
    } //rvin-end
  }
  return { ipRequest, paymentTypes };
};

/**
 * Get Journal Entry (Surcharge) request for the Incoming Payment made via Card
 * @param {*} cardCode  Customer CardCode
 * @param {*} surchargeAmount
 * @param {*} storeLocation
 * @returns
 */
export const getJournalEntryRequest = (cardCode, paymentInfo, surchargeAmount, storeLocation) => {
  const request = {
    // Commented this to set server date in the backend
    // TaxDate: POSTING_DATE,
    // DueDate: POSTING_DATE,
    // ReferenceDate: POSTING_DATE,
    Reference: null,
    Reference2: null,
    Memo: "",
    JournalEntryLines: [
      {
        Line_ID: 0,
        BPLID: DEFAULT_BRANCH_ID,
        CostingCode: storeLocation,
        AccountCode: paymentInfo?.[PAYMENT_METHODS.Card]?.SurchargeAccount,
        // ControlAccount: paymentInfo?.[PAYMENT_METHODS.Card]?.SurchargeAccount,
        Debit: surchargeAmount,
        Credit: 0,
      },
      {
        Line_ID: 1,
        BPLID: DEFAULT_BRANCH_ID,
        CostingCode: storeLocation,
        // AccountCode: paymentInfo?.[PAYMENT_METHODS.Card]?.AcctCode, // SAP automatically sets it with Customer"s AccountCode
        // ControlAccount: paymentInfo?.[PAYMENT_METHODS.Card]?.AcctCode,

        /** Hard-coded to fix the error below,
         * Cannot perform transaction in controlling type account [JournalEntryLines.AccountCode][line: 2],
         * "AJAXBS005"
         */

        // DIDN'T Work - AJAXBS050, AJAXBS215
        // AccountCode: "AJAXIN561", // `to` Account
        // ControlAccount: "AJAXIN561",
        Debit: 0,
        Credit: surchargeAmount,
        ShortName: cardCode,
        ContraAccount: paymentInfo?.[PAYMENT_METHODS.Card]?.SurchargeAccount, // `from` Account in the `Credit` (above ele.)
      },
    ],
  };
  return request;
};

const generateUniqueID = () => {
  const now = new Date();

  const pad = (n) => n.toString().padStart(2, "0");

  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1); // Month is 0-based
  const year = now.getFullYear();

  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  return `${day}${month}${year}${hours}${minutes}${seconds}`;
};
