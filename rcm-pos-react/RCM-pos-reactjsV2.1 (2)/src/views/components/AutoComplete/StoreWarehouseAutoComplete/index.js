import React, { forwardRef } from "react";
import BaseSelectAutoCompleteWithFilter from "../../BaseComponents/BaseSelectAutoCompleteWithFilter";
import { getStoreWarehouses } from "../../../../helper/store-warehouse";

/**
 *
 * @param {*} props storeId, handleSelection, setWarningMsg, name, value
 */
const StoreWarehouseAutoComplete = (
  { storeId, handleSelection, setWarningMsg, name, value, clearButton = false },
  ref,
) => {
  const recordType = "Warehouse";
  const labelField = "warehouseName"; //NOT Required as the recs. list is an array of Strings, NOT array of Objects
  const queryKey = "storeWarehouseList";

  return (
    <>
      <BaseSelectAutoCompleteWithFilter
        ref={ref}
        name={name}
        value={value}
        recordType={recordType}
        labelField={labelField}
        queryKey={queryKey}
        filter={storeId}
        handleSelection={handleSelection}
        getRecords={getStoreWarehouses}
        setWarningMsg={setWarningMsg}
        clearButton={clearButton}
      />
    </>
  );
};

//Forwarding ref. to Parent component
export default forwardRef(StoreWarehouseAutoComplete);
