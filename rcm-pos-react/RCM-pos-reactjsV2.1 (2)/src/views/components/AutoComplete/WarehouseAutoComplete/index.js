import React, { useState, useEffect, forwardRef } from "react";
import BaseAutoCompleteWithFilter from "../../BaseComponents/BaseAutoCompleteWithFilter";
import { getWarehousesForBranch } from "../../../../helper/bin-warehouse";
import { useQueryClient } from "@tanstack/react-query";

/**
 *
 * @param {*} props branchId, id, isBranchNotRequired, handleSelection, setWarningMsg, index
 */
const WarehouseAutoComplete = (
  {
    branchId = null,
    id = "",
    value = "",
    isBranchNotRequired = true,
    handleSelection,
    setWarningMsg,
    index,
  },
  ref,
) => {
  const recordType = "Warehouse";
  const labelField = "WhsName";
  const queryKey = "warehouseList";

  const queryClient = useQueryClient();
  const [selected, setSelected] = useState([]);

  const getRecordHelper = async () => {
    return await getWarehousesForBranch(branchId);
  };

  /**
   * Checks for Duplicate warehouse
   * @param {*} warehouse
   * @returns
   */
  const getSelectedRecord = () => {
    const key = !branchId && isBranchNotRequired ? [queryKey] : [queryKey, branchId];

    const recordList = queryClient.getQueryData(key);
    let matchingRecord = "";
    if (Array.isArray(recordList) && recordList.length > 0) {
      matchingRecord = recordList.find((ele) => ele.WhsCode === value.warehouseCode);
    }
    console.log("matchingRecord: ", matchingRecord);
    return matchingRecord;
  };

  useEffect(() => {
    if (value && value.warehouseCode) {
      setSelected(getSelectedRecord());
    } else {
      setSelected([]);
    }
  }, [value]);

  return (
    <>
      <BaseAutoCompleteWithFilter
        id={id}
        ref={ref}
        recordType={recordType}
        labelField={labelField}
        queryKey={queryKey}
        filter={branchId}
        // To fetch the recs. even when a filter value is not passed
        fetchWithoutFilter={isBranchNotRequired}
        index={index}
        handleSelection={handleSelection}
        value={selected}
        getRecords={getWarehousesForBranch}
        setWarningMsg={setWarningMsg}
        clearButton={true}
        renderMenuItemChildren={(option) => (
          <>
            <span>
              {option.WhsCode} - {option.WhsName}
            </span>
            {/* <div>
              <small>Item Code: {option.WhsCode}</small>
            </div> */}
          </>
        )}
      />
    </>
  );
};

//Forwarding ref. to Parent component
export default forwardRef(WarehouseAutoComplete);
