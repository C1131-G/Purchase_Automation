import React, { useState, useEffect } from "react";
import { Button, Row, Col, Input, FormGroup } from "reactstrap";
import ChildRecordsTableWithSaveAll from "../../components/ChildRecordsTableWithSaveAll";
// import CounterTable from "./CounterTable";
import PreviewPrintCounterQRCodes from "../../components/PreviewPrintCounterQRCodes";
import InputWithLabel from "../../../components/Input/InputWithLabel";
import { displayModes, statusColors } from "../../../config/config";
import {
  getStoreCounters,
  createStoreCounter,
  deleteStoreCounter,
  updateStoreCounter,
} from "../../../helper/store-counter";
import { useQueryClient } from "@tanstack/react-query";

/**
 *
 * @param {*} props `parentId, setSuccessMsg, setWarningMsg`
 */
const StoreCounters = ({ parentId, setSuccessMsg, setWarningMsg }) => {
  const recordType = "Terminal";
  const primaryKeyField = "storeCounterId";
  const uniqueField = "counterCode";
  const queryKey = "storeCounterList";
  const emptyRecord = { counterName: "", description: "" };

  const [displayMode, setDisplayMode] = useState(displayModes.VIEW);
  const [counterListToPrint, setCounterListToPrint] = useState([]);

  //ZZZ: Added to clear selected Terminal list when Print btn is clicked. But DIDN'T work!
  // const handlePrint = () => {
  //   //clear the list once the Print button is clicked
  //   setCounterListToPrint([]);
  // }

  const PrintQRCodeButton = () => {
    return (
      // <Button size="sm" color="info" className="mb-2" onClick={undefined}>Print QR Code</Button>
      <PreviewPrintCounterQRCodes
        showPrintOptions={false}
        label="Print QR Code"
        color="info"
        counterList={counterListToPrint}
        // handlePrint={handlePrint}
      />
    );
  };

  const handleAddCounterToPrintList = (newCounter, addAllCounter = false) => {
    let list;
    if (addAllCounter) {
      list = newCounter; //array of All counters is passed when addAllCounter is `true`
    } else {
      list = [...counterListToPrint, newCounter];
    }
    setCounterListToPrint(list);
  };

  const handleRemoveCounterFromPrintList = (newCounter, removeAllCounter = false) => {
    let list = [];
    //if removeAllCounter is `true` remove all counters from the print list
    if (removeAllCounter) {
      list = [];
    } else {
      list = counterListToPrint.filter((counter) => counter.counterCode !== newCounter.counterCode);
    }
    setCounterListToPrint(list);
  };

  const RecordDetails = ({ index, record, displayMode, invalidData, handleChange }) => {
    // const queryClient = useQueryClient();
    // const userList = queryClient.getQueryData(["storeUserList", parentId]);
    const queryClient = useQueryClient();
    const [userList, setUserList] = useState([]);

    useEffect(() => {
      const fetchUserList = async () => {
        const data = queryClient.getQueryData(["storeUserList", parentId]);
        if (data) {
          setUserList(data);
        } else {
          setUserList([]);
        }
      };
      fetchUserList();
    }, [parentId, queryClient]);

    return (
      <>
        <td>
          <InputWithLabel
            // label=`${recordType} Name`
            placeholder={`Enter a ${recordType} Name`}
            fieldName="counterName"
            value={record.counterName ? record.counterName : ""}
            type="text"
            displayMode={displayMode}
            invalidMessage={invalidData ? invalidData.counterName : null}
            handleChange={(e) => handleChange(e, index)}
          />
        </td>
        <td>
          <InputWithLabel
            // label=`${recordType} Code`
            placeholder={`Enter a ${recordType} Code`}
            fieldName="counterCode"
            value={record.counterCode ? record.counterCode : ""}
            type="text"
            displayMode={displayMode}
            handleChange={(e) => handleChange(e, index)}
          />
        </td>
        <td>
          <FormGroup className="mt-1">
            <Input
              bsSize="sm"
              type="select"
              name="userId"
              value={record.userId ? record.userId : ""}
              onChange={(e) => handleChange(e, index)}
              disabled={displayMode == "VIEW"}
            >
              <option value="">-- Select User --</option>
              {userList?.map((user) => {
                return (
                  <option key={user.userId} value={user.userId}>
                    {user.userName}
                  </option>
                );
              })}
            </Input>
          </FormGroup>
        </td>
        <td>
          <InputWithLabel
            // label="Description"
            placeholder="Enter a Description"
            fieldName="description"
            value={record.description ? record.description : ""}
            type="textarea"
            rows={2}
            displayMode={displayMode}
            handleChange={(e) => handleChange(e, index)}
          />
        </td>
        {/* <td sm="3" className="mt-4 pt-1">
          <Button outline size="sm" color="primary" onClick={undefined}>Generate Code</Button>
        </td> */}
      </>
    );
  };

  const headerColumns = ["#", `${recordType} Name`, `${recordType} Code`, "User", "Description"];
  return (
    <ChildRecordsTableWithSaveAll
      headerColumns={headerColumns}
      recordsPerRow="1"
      displayMode={displayMode}
      setDisplayMode={setDisplayMode}
      recordType={recordType}
      uniqueField={uniqueField}
      emptyRecord={emptyRecord}
      title={recordType + "s"}
      subTitle={`${
        displayMode === displayModes.VIEW
          ? `Click Edit to Add, Edit or Remove ${recordType}`
          : `Enter a ${recordType} & Save`
      }`}
      parentId={parentId}
      primaryKeyField={primaryKeyField}
      queryKey={queryKey}
      getRecordHelper={getStoreCounters}
      createRecordHelper={createStoreCounter}
      updateRecordHelper={updateStoreCounter}
      deleteRecordHelper={deleteStoreCounter}
      setSuccessMsg={setSuccessMsg}
      setWarningMsg={setWarningMsg}
      recordDetails={RecordDetails}
      additionalButtons={
        displayMode === displayModes.VIEW && counterListToPrint.length > 0
          ? PrintQRCodeButton
          : null
      }
      enableCheckbox={false} //for Print
      handleRecordCheck={handleAddCounterToPrintList}
      handleRecordUncheck={handleRemoveCounterFromPrintList}
    />
  );
};

export default StoreCounters;
