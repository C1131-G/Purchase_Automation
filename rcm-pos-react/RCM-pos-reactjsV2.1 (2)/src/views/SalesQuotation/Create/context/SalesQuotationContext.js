import React, { createContext, useCallback, useState, useContext } from "react";
import { produce } from "immer";
import {
  getTotalQuantity as getTotalQuantityUtil,
  getTaxableAmount as getTaxableAmountUtil,
  getTotalTax as getTotalTaxUtil,
  getTotalAmount,
  getTotalAmountbyTotalPrice,
} from "../../../common-utils/calculations.util.js";
import { isGrossPriceEnabled, portalModules, PRECISION } from "../../../../config/config.js";
import {
  createSharedParkTransactions,
  getSharedParkTransactions,
  deleteSharedParkTransaction,
} from "helper/park-transactions.js";
import { getParkTransSalesQuotationRequest } from "views/common-utils/prepare-payload.util.js";

export const SalesQuotationContext = createContext();

export const SalesQuotationProvider = ({ children }) => {
  const LS_PARKED_TRX = "parkedQuotationTrxs";

  const [customer, setCustomer] = useState("");
  const [salesQuotationItems, setItem] = useState([]);
  const [salesQuotationHeader, setHeader] = useState({});
  const [warehouseCode, setWarehouseCode] = useState("");
  const [paymentInfo, setPaymentInfo] = useState({});
  const [paidAmount, setPaidAmount] = useState(0); //Currently NOT used in any components
  const [taxProp, setTaxProp] = useState("");
  const [salesQuotationResponse, setSalesQuotationResponse] = useState("");
  const [isOneTimeCustomer, setIsOneTimeCustomer] = useState(true);
  const [isCODCustomer, setIsCODCustomer] = useState(false);
  const [oneTimeCustomerDetails, setOneTimeCustomerDetails] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [isEditQuotation, setEditQuotation] = useState(false);
  const [parkedTransaction, setParkedTransaction] = useState([]);
  const [parkTransactionResponse, setParkTransactionResponse] = useState("");
  const [warningMsg, setWarningMsg] = useState("");
  const [timYardTransactions, setTimYardTransactions] = useState({});
  const [itemsDeleted, setItemsDeleted] = useState([]); // deleted line items

  const setSalesQuotationCustomer = (customer) => {
    setCustomer(customer);
  };

  const setSalesQuotationHeader = (propName, value) => {
    setHeader({ ...salesQuotationHeader, [propName]: value });
  };

  const setBulkSalesQuotationHeaders = (headers) => {
    setHeader(headers);
  };

  // Set multiple fields in salesQuotationHeader at once
  const setBulkSalesQuotationHeaderFields = (fields) => {
    setHeader((prev) => ({ ...prev, ...fields }));
  };

  const setTimYardTransactionsByItem = (itemCode, newArray) => {
    setTimYardTransactions((prev) => ({
      ...prev,
      [itemCode]: newArray, // Cumulate arrays into the object by itemCode
    }));
  };

  const setParkedTrans = (propName, value) => {
    setParkedTransaction((parkedTransaction) => ({
      ...parkedTransaction,
      [propName]: value,
    }));
  };

  const resetSalesQuotationHeader = () => {
    // Reset the details other than `SalesPersonCode`
    setHeader({ SalesPersonCode: salesQuotationHeader.SalesPersonCode });
  };

  const getPaidAmount = () => {
    let amountPaid = 0;
    if (paymentInfo && Object.keys(paymentInfo).length > 0) {
      Object.keys(paymentInfo).forEach((paymentType) => {
        amountPaid += paymentInfo[paymentType].amount
          ? parseFloat(paymentInfo[paymentType].amount)
          : 0;
      });
    }
    return amountPaid;
  };

  /**
   * SalesQuotation Total Quantity
   * @returns
   */
  const getTotalQuantity = () => {
    return getTotalQuantityUtil(salesQuotationItems);
  };

  /**
   * Sales Quotation Total Tax Amount
   * @returns
   */
  const getTaxableAmount = () => {
    return getTaxableAmountUtil(salesQuotationItems);
  };

  /**
   * Calculates Total Tax based on the Total Amount & Tax%
   * @returns
   */
  const getTotalTax = () => {
    return getTotalTaxUtil(salesQuotationItems, taxProp);
  };

  /**
   * Adds the Tax% with Total Price and returns the value
   * @returns
   */
  const getTotalSalesQuotationAmount = (precision) => {
    //return getTotalAmount(salesQuotationItems, taxProp, precision);
    return isGrossPriceEnabled
      ? getTotalAmountbyTotalPrice(salesQuotationItems, taxProp, precision)
      : getTotalAmount(salesQuotationItems, taxProp, precision);
  };

  /** NOTE: Memoized funct. will always refer to the same funct. instance throughout the component's
   * lifecycle. It won't be re-created on re-renders.
   *
   * `useCallback` is used to memoize functions. It returns a memoized version of the function that only
   * changes if one of the dependencies has changed. This can help avoid unnecessary re-creation of funct.
   * references.
   *
   * Useful for passing stable callbacks to child components, preventing re-renders when props change
   *
   **/
  const setSalesQuotationItem = useCallback((newItem) => {
    setItem(
      //Using `immer` to update the array in the state without mutating it
      produce((draft) => {
        draft.push(newItem);
      }),
    );
    //passing an empty dependency array means, the function will be created once during the initial render
    //and will not change for subsequent renders
  }, []);

  const setBulkSalesQuotationItem = (items) => {
    setItem(items);
  };

  const updateSalesQuotationItem = useCallback((index, updatedItem) => {
    // console.log(`Context - updateSalesQuotationItem:  updatedItem: ${JSON.stringify(updatedItem)}`);
    //`immer` creates a draft copy of the original array, which you can modify in a mutable style
    setItem(
      produce((draft) => {
        // draft[index][property] = value; //replace the old value with the updated one
        draft.splice(index, 1, updatedItem); //replace the old item with the updated one
      }),
    );
  }, []);

  // const deleteSalesQuotationItem = useCallback((index) => {
  //   setItem(
  //     produce((draft => {
  //       draft.splice(index, 1);
  //     }))
  //   );
  // }, []);

  const deleteSalesQuotationItem = useCallback((index, currentState) => {
    setItem((prevItems) =>
      produce(prevItems, (draft) => {
        const deletedItem = draft[index];
        if (deletedItem) {
          console.log("Deleted Item: ", JSON.stringify(deletedItem));
          // Keep track of deleted items with LineNum
          console.log("isEditQuotation: ", currentState);
          if (currentState) {
            // Copy deletedItem out of the draft before using in setItemsDeleted
            const deletedItemCopy = deletedItem
              ? { LineNum: deletedItem.LineNum, ...deletedItem }
              : null;
            setItemsDeleted((prevDeleted) => {
              const updated = [...prevDeleted];
              if (
                deletedItemCopy &&
                !updated.some((item) => item.LineNum === deletedItemCopy.LineNum)
              ) {
                updated.push(deletedItemCopy);
              }
              console.log("ItemsDeleted after update:", JSON.stringify(updated));
              return updated;
            });
          }

          // Remove from current items
          draft.splice(index, 1);
        }
      }),
    );
  }, []);

  const resetItems = () => {
    setItem([]);
    setItemsDeleted([]);
  };

  /**
   * Add the `current` Customer & Items to LocalStorage & remove them from the `context`
   */
  const handleParkTrx = async () => {
    if (
      Object.keys(customer).length > 0 ||
      (Array.isArray(salesQuotationItems) && salesQuotationItems.length > 0)
    ) {
      const request = getParkTransSalesQuotationRequest(
        customer,
        salesQuotationHeader,
        salesQuotationItems,
        customerAddress,
        isCODCustomer,
        oneTimeCustomerDetails,
        isOneTimeCustomer,
        parkedTransaction,
        portalModules.SALES_QUOTATION,
      );
      console.log("Create Park Transactions request: ", JSON.stringify(request));

      try {
        //Create Sales Quotation
        let response = "";
        response = await createSharedParkTransactions(request);
        console.log("Create Park Transactions Response: ", JSON.stringify(response));

        if (response) {
          setParkTransactionResponse(response);
        }
      } catch (err) {
        if (err.response?.data?.message) {
          setWarningMsg(err.response.data.message);
        } else {
          setWarningMsg(err);
        }
      }

      // Reset form
      setCustomer({});
      setItem([]);
      setHeader({}); // NOT setSalesHeader({})
      setCustomerAddress("");
      setIsOneTimeCustomer(true);
      setIsCODCustomer(false);
      setOneTimeCustomerDetails("");
      setParkedTransaction([]);
      // TODO: Display a msg that the Trx has been parked!
    }
  };

  /**
   * Sets the selected trx from the `DB` back to the `context`
   **/
  const resumeTrx = async (id) => {
    const selectedTrx = await getParkedTrxs(id);
    if (selectedTrx instanceof Object && !Array.isArray(selectedTrx)) {
      setCustomer(selectedTrx.data.customer);
      setItem(selectedTrx.data.salesQuotationItems);
      setHeader(selectedTrx.data.salesQuotationHeader); // NOT setSalesHeader({})
      setCustomerAddress(selectedTrx.data.customerAddress);
      setIsOneTimeCustomer(selectedTrx.data.isOneTimeCustomer);
      setIsCODCustomer(selectedTrx.data.isCODCustomer);
      setOneTimeCustomerDetails(selectedTrx.data.oneTimeCustomerDetails);
      setParkedTransaction(selectedTrx.data.parkedTransaction);
      //Remove the selected trx from the DB
      deleteParkedTrx(id);
    }
  };

  /**
   *
   * @returns Parked Trx count
   */
  const getParkedTrxCount = () => {
    let parkedTrxsCount = 0;
    let parkedTrxs = localStorage.getItem(LS_PARKED_TRX);
    if (parkedTrxs) {
      parkedTrxs = JSON.parse(parkedTrxs);
      if (Array.isArray(parkedTrxs)) {
        parkedTrxsCount = parkedTrxs.length;
      }
    }
    return parkedTrxsCount;
  };

  /**
   * Get Parked Trxs from the `DB`
   * @returns Parked Trx count
   */
  const getParkedTrxs = async (id) => {
    let trxs = [];
    try {
      let parkedTrxs = await getSharedParkTransactions();
      if (parkedTrxs) {
        if (Array.isArray(parkedTrxs)) {
          //Return the trx at a specified position if a valid index is passed
          // Convert the 'data' field to a JSON object
          parkedTrxs = parkedTrxs.map((entry) => {
            return {
              ...entry,
              data: JSON.parse(entry.data),
            };
          });

          if (id > -1) {
            trxs = parkedTrxs.find((entry) => entry.parkedTransactionId === id);
          }
          //or return the entire trx list
          else {
            trxs = parkedTrxs;
          }
        }
      }
    } catch (err) {
      setWarningMsg(err?.message);
    }
    return trxs;
  };

  /**
   * Add the `current` Customer & Items to LocalStorage & remove them from the `context`
   */
  const deleteParkedTrx = async (id) => {
    try {
      //Create Sales Quotation
      let response = "";
      response = await deleteSharedParkTransaction(id);
      if (response.data) {
        return response.data.affected;
      }
      return;
    } catch (error) {
      throw error;
    }
  };

  return (
    <SalesQuotationContext.Provider
      value={{
        customer,
        setSalesQuotationCustomer,
        warehouseCode,
        setWarehouseCode,
        salesQuotationItems,
        setSalesQuotationItem,
        setItem,
        setBulkSalesQuotationItem,
        salesQuotationHeader,
        setSalesQuotationHeader,
        resetSalesQuotationHeader,
        setBulkSalesQuotationHeaders,
        setBulkSalesQuotationHeaderFields,
        updateSalesQuotationItem,
        deleteSalesQuotationItem,
        paidAmount,
        setPaidAmount,
        paymentInfo,
        setPaymentInfo,
        getPaidAmount,
        getTotalQuantity,
        getTaxableAmount,
        getTotalTax,
        getTotalSalesQuotationAmount,
        taxProp,
        setTaxProp,
        salesQuotationResponse,
        setSalesQuotationResponse,
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
        isEditQuotation,
        setEditQuotation,
        itemsDeleted,
        setItemsDeleted,
        timYardTransactions,
        setTimYardTransactionsByItem,
      }}
    >
      {children}
    </SalesQuotationContext.Provider>
  );
};
