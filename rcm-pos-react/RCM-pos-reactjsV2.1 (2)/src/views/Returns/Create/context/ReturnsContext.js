import React, { createContext, useCallback, useState } from "react";
import { produce } from "immer";
import { round } from "../../../../config/util.js";
import { PRECISION } from "../../../../config/config.js";

export const ReturnsContext = createContext();

export const ReturnsProvider = ({ children }) => {
  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [returnsItems, setItem] = useState([]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [taxProp, setTaxProp] = useState("");
  const [creditMemoResponse, setCreditMemoResponse] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);

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
  const setReturnsItems = useCallback((items) => {
    setItem(items);
    // setItem(
    //   //Using `immer` to update the array in the state without mutating it
    //   (produce(draft => {
    //     draft.push(newItem);
    //   }))
    // );
    //passing an empty dependency array means, the function will be created once during the initial render
    //and will not change for subsequent renders
  }, []);

  const updateReturnsItem = useCallback((index, updatedItem) => {
    // console.log(`Context - updateReturnsItem:  updatedItem: ${JSON.stringify(updatedItem)}`);
    //`immer` creates a draft copy of the original array, which you can modify in a mutable style
    setItem(
      produce((draft) => {
        // draft[index][property] = value; //replace the old value with the updated one
        draft.splice(index, 1, updatedItem); //replace the old item with the updated one
      }),
    );
  }, []);

  const removeReturnsItem = useCallback((index) => {
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
    returnsItems.forEach((item) => {
      // Add only the Qtry that are selected for Returns
      if (item.isSelectedForReturn) {
        totalQty += parseFloat(item.Quantity);
      }
    });
    return totalQty;
  };

  /**
   * Returns Total Tax Amount
   * @returns
   */
  const getTaxableAmount = () => {
    let total = 0;
    returnsItems.forEach((item) => {
      // total += parseFloat(item.LineTotal);

      // Get the sum of `TotalPrice` when the item is selected for Returns
      // total += item.isSelectedForReturn ? parseFloat(item.TotalPrice) : parseFloat(item.LineTotal);
      total += item.TotalPrice ? parseFloat(item.TotalPrice) : 0;
    });
    return round(total, PRECISION);
  };

  /**
   * Calculates Total Tax based on the Total Amount & Tax%
   * @returns
   */
  const getTotalTax = () => {
    let taxAmount = 0;

    returnsItems.forEach((item) => {
      if (item.isSelectedForReturn) {
        taxAmount += round(item[taxProp], PRECISION);
      }
    });
    return round(taxAmount, PRECISION);
  };

  /**
   * Adds the Tax% with Total Price and returns the value
   * @returns
   */
  const getTotalAmount = () => {
    let invoiceAmount = 0;
    const taxableAmount = getTaxableAmount();
    if (taxableAmount > 0) {
      invoiceAmount = round(taxableAmount + getTotalTax(), PRECISION);
    }
    return invoiceAmount;
  };

  const resetItems = () => {
    setItem([]);
  };

  return (
    <ReturnsContext.Provider
      value={{
        selectedInvoice,
        returnsItems,
        setSelectedInvoice,
        setReturnsItems,
        updateReturnsItem,
        removeReturnsItem,
        getTotalQuantity,
        getTaxableAmount,
        getTotalTax,
        getTotalAmount,
        paidAmount,
        setPaidAmount,
        taxProp,
        setTaxProp,
        creditMemoResponse,
        setCreditMemoResponse,
        resetItems,
        attachmentFile,
        setAttachmentFile,
      }}
    >
      {children}
    </ReturnsContext.Provider>
  );
};
