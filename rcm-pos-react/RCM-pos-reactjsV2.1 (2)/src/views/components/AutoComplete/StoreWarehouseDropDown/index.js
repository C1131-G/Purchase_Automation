import React from "react";
import BaseDropDownWithFilter from "../../BaseComponents/BaseDropDownWithFilter";
import { getStoreWarehouses } from "../../../../helper/store-warehouse";

/**
 *
 * @param {*} props storeId, handleSelection, setWarningMsg, name, value
 */
const StoreWarehouseDropDown = ({ storeId, value, propName, handleSelection, setWarningMsg }) => {
  const recordType = "Warehouse";
  const valueField = "warehouseCode";
  const labelField = "warehouseName";
  const queryKey = "storeWarehouseList";

  return (
    <>
      <BaseDropDownWithFilter
        propName={propName}
        value={value}
        recordType={recordType}
        valueField={valueField}
        labelField={labelField}
        queryKey={queryKey}
        filter={storeId}
        handleSelection={handleSelection}
        getRecords={getStoreWarehouses}
        setWarningMsg={setWarningMsg}
      />
    </>
  );
};

export default StoreWarehouseDropDown;
