import React, { createContext, useCallback, useState } from "react";
import { produce } from "immer";
import {
  getTotalQuantity as getTotalQuantityUtil,
  getTaxableAmount as getTaxableAmountUtil,
  getTotalTax as getTotalTaxUtil,
  getTotalAmount,
} from "../../../common-utils/calculations.util.js";

export const ViewSalesContext = createContext();

export const ViewSalesProvider = ({ children }) => {
  const [selectedRecord, setSelectedRecord] = useState("");
  const [items, setItems] = useState([]);
  const [taxProp, setTaxProp] = useState("");

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
  const setInvoiceItems = useCallback((items) => {
    setItems(items);
    // setItems(
    //   //Using `immer` to update the array in the state without mutating it
    //   (produce(draft => {
    //     draft.push(newItem);
    //   }))
    // );
    //passing an empty dependency array means, the function will be created once during the initial render
    //and will not change for subsequent renders
  }, []);

  /**
   * Invoice Total Quantity
   * @returns
   */
  const getTotalQuantity = () => {
    return getTotalQuantityUtil(items);
  };

  /**
   * Invoice Total Tax Amount
   * @returns
   */
  const getTaxableAmount = () => {
    return getTaxableAmountUtil(items);
  };

  /**
   * Calculates Total Tax based on the Total Amount & Tax%
   * @returns
   */
  const getTotalTax = () => {
    return getTotalTaxUtil(items, taxProp);
  };

  /**
   * Adds the Tax% with Total Price and returns the value
   * @returns
   */
  const getTotalInvoiceAmount = (precision) => {
    return getTotalAmount(items, taxProp, precision);
  };

  const resetItems = () => {
    setItems([]);
  };

  return (
    <ViewSalesContext.Provider
      value={{
        selectedRecord,
        setSelectedRecord,
        items,
        setInvoiceItems,
        getTotalQuantity,
        getTaxableAmount,
        getTotalTax,
        getTotalInvoiceAmount,
        taxProp,
        setTaxProp,
        resetItems,
      }}
    >
      {children}
    </ViewSalesContext.Provider>
  );
};
