import React, { createContext, useCallback, useState } from "react";
import { produce } from "immer";
import { round } from "../../../../config/util.js";
import { PRECISION } from "../../../../config/config.js";

export const ReturnsContext = createContext();

export const ReturnsProvider = ({ children }) => {
  // --- View Screen States ---
  const [selectedReturns, setSelectedReturns] = useState("");
  const [returnsDocNum, setReturnsDocNum] = useState("");
  const [creditMemoResponse, setCreditMemoResponse] = useState("");

  // --- Creation Screen States (CRITICAL FIX) ---
  const [selectedInvoice, setSelectedInvoice] = useState(""); // Used by Grid.jsx & ItemSummary.js
  const [attachmentFile, setAttachmentFile] = useState(null); // Holds the actual File object

  // --- Shared Item States ---
  const [returnsItems, setItem] = useState([]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [taxProp, setTaxProp] = useState("");

  const setReturnsItems = useCallback((items) => {
    setItem(items);
  }, []);

  const updateReturnsItem = useCallback((index, updatedItem) => {
    setItem(
      produce((draft) => {
        draft.splice(index, 1, updatedItem);
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

  const getTotalQuantity = () => {
    let totalQty = 0;
    returnsItems.forEach((item) => {
      if (item.isSelectedForReturn) totalQty += parseFloat(item.Quantity || 0);
    });
    return totalQty;
  };

  const getTaxableAmount = () => {
    let total = 0;
    returnsItems.forEach((item) => {
      if (item.isSelectedForReturn) total += parseFloat(item.TotalPrice || 0);
    });
    return round(total, PRECISION);
  };

  const getTotalTax = () => {
    let taxAmount = 0;
    returnsItems.forEach((item) => {
      if (item.isSelectedForReturn) taxAmount += round(item[taxProp] || 0, PRECISION);
    });
    return round(taxAmount, PRECISION);
  };

  const getTotalAmount = () => {
    let returnsAmount = 0;
    const taxableAmount = getTaxableAmount();
    if (taxableAmount > 0) {
      returnsAmount = round(taxableAmount + getTotalTax(), PRECISION);
    }
    return returnsAmount;
  };

  const resetItems = () => {
    setItem([]);
    setAttachmentFile(null); // Clear the file
    setCreditMemoResponse(""); // Clear success message
    // We don't necessarily clear selectedInvoice here unless you want to go back to list
  };

  return (
    <ReturnsContext.Provider
      value={{
        // Selection
        selectedReturns,
        setSelectedReturns,
        selectedInvoice,
        setSelectedInvoice,

        // Items
        returnsItems,
        setReturnsItems,
        updateReturnsItem,
        removeReturnsItem,

        // Calculations
        getTotalQuantity,
        getTaxableAmount,
        getTotalTax,
        getTotalAmount,

        // Metadata
        paidAmount,
        setPaidAmount,
        taxProp,
        setTaxProp,
        returnsDocNum,
        setReturnsDocNum,
        creditMemoResponse,
        setCreditMemoResponse,

        // Attachment (CRITICAL FIX)
        attachmentFile,
        setAttachmentFile,

        resetItems,
      }}
    >
      {children}
    </ReturnsContext.Provider>
  );
};
