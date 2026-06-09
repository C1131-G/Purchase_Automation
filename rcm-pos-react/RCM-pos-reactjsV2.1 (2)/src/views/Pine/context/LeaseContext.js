import React, { createContext, useCallback, useState } from "react";
import { produce } from "immer";
import { round } from "../../../config/util";

const PRECISION = 2;
export const LeaseContext = createContext();

export const LeaseProvider = ({ children }) => {
  const [customer, setCustomer] = useState({});
  const [salesItems, setItem] = useState([]);
  const [paidAmount, setPaidAmount] = useState(0);

  const setSalesCustomer = (customer) => {
    setCustomer(customer);
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
  const setSalesItem = useCallback((newItem) => {
    setItem(
      //Using `immer` to update the array in the state without mutating it
      produce((draft) => {
        draft.push(newItem);
      }),
    );
    //passing an empty dependency array means, the function will be created once during the initial render
    //and will not change for subsequent renders
  }, []);

  const updateSalesItem = useCallback((index, updatedItem) => {
    console.log(`Context - updateSalesItem:  updatedItem: ${JSON.stringify(updatedItem)}`);
    //`immer` creates a draft copy of the original array, which you can modify in a mutable style
    setItem(
      produce((draft) => {
        // draft[index][property] = value; //replace the old value with the updated one
        draft.splice(index, 1, updatedItem); //replace the old item with the updated one
      }),
    );
  }, []);

  const deleteSalesItem = useCallback((index) => {
    setItem(
      produce((draft) => {
        draft.splice(index, 1);
      }),
    );
  }, []);

  /**
   * Returns Total Quantity that's added to POS
   * @returns
   */
  const getTotalQuantity = () => {
    let totalQty = 0;
    salesItems.forEach((item) => {
      totalQty += parseFloat(item.Quantity);
    });
    return totalQty;
  };

  /**
   * Returns Total Quantity that's added to POS
   * @returns
   */
  const getTaxableAmount = () => {
    let total = 0;
    salesItems.forEach((item) => {
      total += parseFloat(item.TotalPrice);
    });
    return round(total, PRECISION);
  };

  /**
   * Gets the Tax%
   */
  const getTaxPercentage = () => {
    return 5; //Added to TESTing
  };

  /**
   * Calculates Total Tax based on the Total Amount & Tax%
   * @returns
   */
  const getTotalTax = () => {
    let taxAmount = 0;
    const taxableAmount = getTaxableAmount();
    if (taxableAmount > 0) {
      taxAmount = round((taxableAmount * getTaxPercentage()) / 100, PRECISION);
    }
    return taxAmount;
  };

  /**
   * Adds the Tax% with Total Price and returns the value
   * @returns
   */
  const getTotalInvoiceAmount = () => {
    let invoiceAmount = 0;
    const taxableAmount = getTaxableAmount();
    if (taxableAmount > 0) {
      invoiceAmount = round(taxableAmount + getTotalTax(), PRECISION);
    }
    return invoiceAmount;
  };

  /**
   * Add the `current` Customer & Items to LocalStorage & remove them from the `context`
   */
  const handlePauseTrx = () => {
    if (Object.keys(customer).length > 0 || (Array.isArray(salesItems) && salesItems.length > 0)) {
      let pausedTrxs = localStorage.getItem("pausedTrxs");
      if (pausedTrxs) {
        // console.log("pausedTrxs: ", pausedTrxs);
        pausedTrxs = JSON.parse(pausedTrxs);
        pausedTrxs.push({ customer, salesItems });
        localStorage.setItem("pausedTrxs", JSON.stringify(pausedTrxs));
      } else {
        const currentTrx = [{ customer, salesItems }];
        localStorage.setItem("pausedTrxs", JSON.stringify(currentTrx));
      }
      setCustomer({});
      setItem([]);
      //Display a msg that the Trx has been paused!
    }
  };

  /**
   *
   * @returns Paused Trx count
   */
  const getPausedTrxCount = () => {
    let pausedTrxsCount = 0;
    let pausedTrxs = localStorage.getItem("pausedTrxs");
    if (pausedTrxs) {
      pausedTrxs = JSON.parse(pausedTrxs);
      if (Array.isArray(pausedTrxs)) {
        pausedTrxsCount = pausedTrxs.length;
      }
    }
    return pausedTrxsCount;
  };

  /**
   * Get Paused Trxs from the `localStorage`
   * @returns Paused Trx count
   */
  const getPausedTrxs = (index = -1) => {
    let trxs = [];
    let pausedTrxs = localStorage.getItem("pausedTrxs");
    if (pausedTrxs) {
      pausedTrxs = JSON.parse(pausedTrxs);
      if (Array.isArray(pausedTrxs)) {
        //Return the trx at a specified position if a valid index is passed
        if (index > -1) {
          trxs = pausedTrxs[index];
        }
        //or return the entire trx list
        else {
          trxs = pausedTrxs;
        }
      }
    }
    return trxs;
  };

  /**
   * Add the `current` Customer & Items to LocalStorage & remove them from the `context`
   */
  const deletePausedTrx = (index) => {
    let pausedTrxs = localStorage.getItem("pausedTrxs");
    if (pausedTrxs) {
      pausedTrxs = JSON.parse(pausedTrxs);
      if (Array.isArray(pausedTrxs) && pausedTrxs.length > 0) {
        pausedTrxs.splice(index, 1);
        localStorage.setItem("pausedTrxs", JSON.stringify(pausedTrxs));
      }
    }
  };

  /**
   * Sets the selected trx from the `localStorage` back to the `context`
   **/
  const resumeTrx = (index) => {
    const selectedTrx = getPausedTrxs(index);
    if (selectedTrx instanceof Object && !Array.isArray(selectedTrx)) {
      setCustomer(selectedTrx.customer);
      setItem(selectedTrx.salesItems);

      //Remove the selected trx from the localStorage
      deletePausedTrx(index);
    }
  };

  return (
    <LeaseContext.Provider
      value={{
        customer,
        salesItems,
        setSalesCustomer,
        setSalesItem,
        updateSalesItem,
        deleteSalesItem,
        getTotalQuantity,
        getTaxableAmount,
        getTaxPercentage,
        getTotalTax,
        getTotalInvoiceAmount,
        paidAmount,
        setPaidAmount,
        handlePauseTrx,
        getPausedTrxCount,
        getPausedTrxs,
        deletePausedTrx,
        resumeTrx,
      }}
    >
      {children}
    </LeaseContext.Provider>
  );
};
