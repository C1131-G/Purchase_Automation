import React, { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Row, Col, Badge } from "reactstrap";
import ChildRecordsCardWithSaveAll from "../../components/ChildRecordsCardWithSaveAll";
import LocationWiseWareHouseAutoComplete from "../../../views/components/AutoComplete/LocationWiseWareHouseAutoComplete";
import { displayModes, statusColors } from "../../../config/config";
import {
  getStoreWarehouses,
  createStoreWarehouse,
  deleteStoreWarehouse,
} from "../../../helper/store-warehouse";

/**
 *
 * @param {*} props `parentId, setSuccessMsg, setWarningMsg`
 */
const StoreWarehouse = ({ parentId, setSuccessMsg, setWarningMsg, locationCode }) => {
  const [key, setKey] = useState(0); // Initialize key state

  useEffect(() => {
    // This effect runs whenever locationCode changes
    // You can perform any actions here based on the locationCode change
    // For example, you might want to fetch data based on the new locationCode
    setKey((prevKey) => prevKey + 1); // Increment key to force remount
  }, [locationCode]); // This ensures the effect runs only when locationCode changes

  const autoCompleteRef = useRef(null);
  const queryClient = useQueryClient();

  const recordType = "Warehouse";
  const primaryKeyField = "storeWarehouseId";
  const queryKey = "storeWarehouseList";
  const uniqueField = "warehouseName";
  // const emptyRecord = { counterName: "", description: "" };

  const [warehouse, setWarehouse] = useState({});
  const [displayMode, setDisplayMode] = useState(displayModes.VIEW);

  /**
   * Clears the selected value from the search box & from the `state`
   */
  const resetWarehouse = () => {
    console.log("autoCompleteRef.current: ", autoCompleteRef.current);
    //Clears the value from the Auto-complete search box
    if (autoCompleteRef.current) {
      autoCompleteRef.current.clear();
    }
    setWarehouse({});
  };

  /**
   * Checks for Duplicate warehouse
   * @param {*} warehouse
   * @returns
   */
  const getDuplicateIndex = (warehouse) => {
    let duplicateIndex = -1;
    const recordList = queryClient.getQueryData([queryKey, parentId]);
    if (Array.isArray(recordList) && recordList.length > 0) {
      duplicateIndex = recordList.findIndex((ele) => ele.warehouseCode == warehouse.WhsCode);
    }
    return duplicateIndex;
  };

  /**
   * Sets the selected warehouse info to state
   * @param {Object} WhsCode, WhsName
   */
  const handleRecordSelection = (selectedRecord) => {
    console.log("handleRecordSelection: ", JSON.stringify(selectedRecord));
    if (selectedRecord && selectedRecord.WhsCode) {
      if (getDuplicateIndex(selectedRecord) > -1) {
        setWarningMsg(recordType + " already exists!");
        resetWarehouse();
      } else {
        setWarehouse({
          warehouseCode: selectedRecord.WhsCode,
          warehouseName: selectedRecord.WhsName,
        });
      }
    } else {
      resetWarehouse();
    }
  };

  const RecordDetails = ({ index, record }) => {
    return (
      <span className="text-sm text-gray-dark font-weight-600">
        {record.warehouseCode} - {record.warehouseName}
        {index === 0 && (
          <Badge className="ml-1" color="info" pill>
            Default Warehouse
          </Badge>
        )}
      </span>
    );
  };

  return (
    <div key={key}>
      <ChildRecordsCardWithSaveAll
        // recordLimit="1"
        recordsPerRow="3"
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
        recordType={recordType}
        uniqueField={uniqueField}
        // emptyRecord={emptyRecord}
        newRecord={warehouse} //pass this when a value must be added from a Dropdown or Auto-complete textbox or pass `emptyRecord` prop
        resetNewRecord={resetWarehouse}
        title={recordType + "s"}
        subTitle={`${
          displayMode === displayModes.VIEW
            ? `Click Edit to Add or Remove ${recordType}`
            : `Enter a ${recordType} & add`
        }`}
        parentId={parentId}
        primaryKeyField={primaryKeyField}
        queryKey={queryKey}
        getRecordHelper={getStoreWarehouses}
        createRecordHelper={createStoreWarehouse}
        // updateRecordHelper={updateStoreWarehouse}
        deleteRecordHelper={deleteStoreWarehouse}
        setSuccessMsg={setSuccessMsg}
        setWarningMsg={setWarningMsg}
        recordDetails={RecordDetails}
        /** NOTE: Passing {<RecordDetails />} to `recordDetails` threw below error,
         * Element type is invalid: expected a string (for built-in components) or a class/function
         * (for composite components) but got: object.
         */
        rightContent={
          <LocationWiseWareHouseAutoComplete
            ref={autoCompleteRef}
            value={warehouse}
            handleSelection={handleRecordSelection}
            setWarningMsg={setWarningMsg}
            locationCode={locationCode}
          />
        }
      />
    </div>
  );
};

export default StoreWarehouse;
