import React, { createContext, useCallback, useState, useContext } from "react";
import { produce } from "immer";
import {
  getTotalQuantity as getTotalQuantityUtil,
  getTaxableAmount as getTaxableAmountUtil,
  getTotalTax as getTotalTaxUtil,
  getTotalAmount,
  getTotalAmountbyTotalPrice,
} from "../../../common-utils/calculations.util.js";
import { portalModules, PRECISION, isGrossPriceEnabled } from "../../../../config/config.js";
import {
  createSharedParkTransactions,
  getSharedParkTransactions,
  deleteSharedParkTransaction,
} from "../../../../helper/park-transactions.js";
import { getParkTransInvoiceRequest } from "../../../common-utils/prepare-payload.util.js";
import { useQueryClient } from "@tanstack/react-query";
import { getAvailableStock } from "../../../../helper/items-helper.js";

export const SalesContext = createContext();

export const SalesProvider = ({ children }) => {
  const LS_PARKED_TRX = "parkedTrxs";
  const queryClient = useQueryClient();

  const [customer, setCustomer] = useState("");
  const [salesItems, setItem] = useState([]);
  const [salesHeader, setHeader] = useState({});
  const [warehouseCode, setWarehouseCode] = useState("");
  const [paymentInfo, setPaymentInfo] = useState({});
  const [cardPaymentInfo, setCardPaymentInfo] = useState([]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [taxProp, setTaxProp] = useState("");
  const [invoiceResponse, setInvoiceResponse] = useState("");
  const [isOneTimeCustomer, setIsOneTimeCustomer] = useState(true);
  const [isCODCustomer, setIsCODCustomer] = useState(false);
  const [oneTimeCustomerDetails, setOneTimeCustomerDetails] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [parkedTransaction, setParkedTransaction] = useState([]);
  const [parkTransactionResponse, setParkTransactionResponse] = useState("");
  const [timYardTransaction, setTimYardTransaction] = useState({});
  const [warningMsg, setWarningMsg] = useState("");
  const [isEditQuotation, setIsEditQuotation] = useState(false);
  const [sqDocNum, setSQDocNum] = useState("");

  // TRANSACTION ID STATE
  const [transactionId, setTransactionId] = useState("");

  const setSalesCustomer = (customer) => {
    setCustomer(customer);
  };
  const setBulkOneTimeCustomerDetails = (fields) => {
    setOneTimeCustomerDetails((prev) => ({ ...prev, ...fields }));
  };
  const setSalesHeader = (propName, value) => {
    setHeader({ ...salesHeader, [propName]: value });
  };
  const setBulkSalesHeaders = (headers) => {
    setHeader(headers);
  };
  const setTimYardTransactions = (itemCode, newArray) => {
    setTimYardTransaction((prev) => ({ ...prev, [itemCode]: newArray }));
  };
  const setParkedTrans = (propName, value) => {
    setParkedTransaction((prev) => ({ ...prev, [propName]: value }));
  };

  // TRANSACTION ID SETTER
  const setTransactionID = (id) => {
    setTransactionId(id);
  };

  const resetSalesHeader = () => {
    setHeader({ SalesPersonCode: salesHeader.SalesPersonCode });
  };
  const clearSalesHeader = () => {
    setHeader({ SalesPersonCode: "" });
  };

  const getPaidAmount = () => {
    let amountPaid = 0;
    if (paymentInfo.Cash?.amount) amountPaid += parseFloat(paymentInfo.Cash.amount);
    if (paymentInfo.Credit?.amount) amountPaid += parseFloat(paymentInfo.Credit.amount);
    if (paymentInfo.Cheque?.amount) amountPaid += parseFloat(paymentInfo.Cheque.amount);
    if (Array.isArray(cardPaymentInfo)) {
      amountPaid += cardPaymentInfo.reduce(
        (sum, entry) => sum + (parseFloat(entry.amount) || 0),
        0,
      );
    }
    return amountPaid;
  };

  const getTotalQuantity = () => getTotalQuantityUtil(salesItems);
  const getTaxableAmount = () => getTaxableAmountUtil(salesItems);
  const getTotalTax = () => getTotalTaxUtil(salesItems, taxProp);
  const getTotalInvoiceAmount = (precision) => {
    return isGrossPriceEnabled
      ? getTotalAmountbyTotalPrice(salesItems, taxProp, precision)
      : getTotalAmount(salesItems, taxProp, precision);
  };

  const setSalesItem = useCallback((newItem) => {
    setItem(
      produce((draft) => {
        draft.push(newItem);
      }),
    );
    setWarningMsg("");
  }, []);

  const setBulkSalesItem = (items) => {
    setItem(items);
  };
  const updateSalesItem = useCallback((index, updatedItem) => {
    setItem(
      produce((draft) => {
        draft.splice(index, 1, updatedItem);
      }),
    );
  }, []);

  const deleteSalesItem = useCallback((index) => {
    setItem(
      produce((draft) => {
        draft.splice(index, 1);
      }),
    );
    setWarningMsg("");
  }, []);

  const resetItems = () => {
    setItem([]);
  };

  const handleParkTrx = async () => {
    if (Object.keys(customer).length > 0 || (Array.isArray(salesItems) && salesItems.length > 0)) {
      const request = getParkTransInvoiceRequest(
        customer,
        salesHeader,
        salesItems,
        customerAddress,
        isCODCustomer,
        oneTimeCustomerDetails,
        isOneTimeCustomer,
        parkedTransaction,
        portalModules.INVOICE,
      );
      try {
        let response = await createSharedParkTransactions(request);
        if (response) setParkTransactionResponse(response);
      } catch (err) {
        setWarningMsg(err.response?.data?.message || err.message);
      }
      setCustomer({});
      setItem([]);
      setHeader({});
      setCustomerAddress("");
      setIsOneTimeCustomer(true);
      setIsCODCustomer(false);
      setOneTimeCustomerDetails("");
      setParkedTransaction([]);
      setWarehouseCode("");
      setHeader({ SalesPersonCode: "" });
    }
  };

  const resumeTrx = async (id) => {
    const selectedTrx = await getParkedTrxs(id);
    if (selectedTrx instanceof Object && !Array.isArray(selectedTrx)) {
      setCustomer(selectedTrx.data.customer);
      setWarehouseCode(selectedTrx.data.salesItems[0].WhsCode);
      setItem(selectedTrx.data.salesItems);
      setHeader(selectedTrx.data.salesHeader);
      setCustomerAddress(selectedTrx.data.customerAddress);
      setIsOneTimeCustomer(selectedTrx.data.isOneTimeCustomer);
      setIsCODCustomer(selectedTrx.data.isCODCustomer);
      setOneTimeCustomerDetails(selectedTrx.data.oneTimeCustomerDetails);
      setParkedTransaction(selectedTrx.data.parkedTransaction);
      deleteParkedTrx(id);
    }
  };

  const getParkedTrxCount = () => {
    let parkedTrxs = localStorage.getItem(LS_PARKED_TRX);
    return parkedTrxs ? JSON.parse(parkedTrxs).length : 0;
  };

  const getParkedTrxs = async (id = -1) => {
    let trxs = [];
    try {
      let parkedTrxs = await getSharedParkTransactions();
      if (Array.isArray(parkedTrxs)) {
        parkedTrxs = parkedTrxs.map((entry) => ({ ...entry, data: JSON.parse(entry.data) }));
        trxs = id > -1 ? parkedTrxs.find((entry) => entry.parkedTransactionId === id) : parkedTrxs;
      }
    } catch (err) {
      setWarningMsg(err?.message);
    }
    return trxs;
  };

  const deleteParkedTrx = async (id) => {
    try {
      let response = await deleteSharedParkTransaction(id);
      return response.data?.affected;
    } catch (error) {
      throw error;
    }
  };

  const validateQuantityAgainstStock = async (
    itemCode,
    whsCode,
    quantity,
    isInvItem,
    lineNumber = null,
  ) => {
    if (isInvItem !== "Y") return { isValid: true, message: "" };
    let cachedStockData = queryClient.getQueryData(["stockAvailabilityInfo", itemCode]);
    if (!cachedStockData) {
      try {
        const stockResponse = await getAvailableStock(itemCode);
        queryClient.setQueryData(["stockAvailabilityInfo", itemCode], stockResponse);
        cachedStockData = stockResponse;
      } catch (error) {
        return { isValid: false, message: "Error fetching stock" };
      }
    }
    const warehouseStock = cachedStockData.find((s) => s.WhsCode === whsCode);
    if (!warehouseStock) return { isValid: false, message: `No stock in warehouse ${whsCode}` };
    const availableQty = parseFloat(warehouseStock.OnHand) || 0;
    if (parseFloat(quantity) > availableQty) {
      return {
        isValid: false,
        message: `Insufficient stock at line# ${lineNumber}! Available: ${availableQty}`,
      };
    }
    return { isValid: true, message: "" };
  };

  const validateAllItemsStock = async () => {
    const validationErrors = [];
    for (let i = 0; i < salesItems.length; i++) {
      const validation = await validateQuantityAgainstStock(
        salesItems[i].ItemCode,
        salesItems[i].WhsCode,
        salesItems[i].Quantity,
        salesItems[i].InvntItem,
        i + 1,
      );
      if (!validation.isValid) validationErrors.push(validation.message);
    }
    return validationErrors;
  };

  return (
    <SalesContext.Provider
      value={{
        customer,
        setSalesCustomer,
        warehouseCode,
        setWarehouseCode,
        salesItems,
        setSalesItem,
        setItem,
        setBulkSalesItem,
        salesHeader,
        setSalesHeader,
        resetSalesHeader,
        setBulkSalesHeaders,
        clearSalesHeader,
        updateSalesItem,
        deleteSalesItem,
        paidAmount,
        setPaidAmount,
        paymentInfo,
        setPaymentInfo,
        getPaidAmount,
        cardPaymentInfo,
        setCardPaymentInfo,
        getTotalQuantity,
        getTaxableAmount,
        getTotalTax,
        getTotalInvoiceAmount,
        taxProp,
        setTaxProp,
        invoiceResponse,
        setInvoiceResponse,
        isOneTimeCustomer,
        setIsOneTimeCustomer,
        isCODCustomer,
        setIsCODCustomer,
        oneTimeCustomerDetails,
        setOneTimeCustomerDetails,
        customerAddress,
        setCustomerAddress,
        handleParkTrx,
        getParkedTrxCount,
        getParkedTrxs,
        deleteParkedTrx,
        resumeTrx,
        resetItems,
        parkedTransaction,
        setParkedTrans,
        timYardTransaction,
        setTimYardTransactions,
        isEditQuotation,
        setIsEditQuotation,
        sqDocNum,
        setSQDocNum,
        setBulkOneTimeCustomerDetails,
        validateQuantityAgainstStock,
        validateAllItemsStock,
        warningMsg,
        setWarningMsg,
        transactionId,
        setTransactionID, // EXPORTED
      }}
    >
      {children}
    </SalesContext.Provider>
  );
};
