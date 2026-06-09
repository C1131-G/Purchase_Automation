import React, { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Row, Col } from "reactstrap";
import ChildRecordsCardWithSaveAll from "../../components/ChildRecordsCardWithSaveAll";
import PortalUserAutoComplete from "../../../views/components/AutoComplete/PortalUserAutoComplete";
import { displayModes, statusColors } from "../../../config/config";
import { getStoreUsers, createStoreUser, deleteStoreUser } from "../../../helper/store-user";

/**
 *
 * @param {*} props `parentId, setSuccessMsg, setWarningMsg`
 */
const StoreUsers = ({ parentId, setSuccessMsg, setWarningMsg }) => {
  const autoCompleteRef = useRef(null);
  const queryClient = useQueryClient();

  const recordType = "User";
  const primaryKeyField = "storeUserId";
  const queryKey = "storeUserList";
  const uniqueField = "userName";
  // const emptyRecord = { counterName: "", description: "" };

  const [user, setUser] = useState({});
  const [displayMode, setDisplayMode] = useState(displayModes.VIEW);

  /**
   * Clears the selected value from the search box & from the `state`
   */
  const resetUser = () => {
    // console.log("autoCompleteRef.current: ", autoCompleteRef.current);
    //Clears the value from the Auto-complete search box
    if (autoCompleteRef.current) {
      autoCompleteRef.current.clear();
    }
    setUser({});
  };

  /**
   * Checks for Duplicate User
   * @param {*} user
   * @returns
   */
  const getDuplicateIndex = (user) => {
    let duplicateIndex = -1;
    const recordList = queryClient.getQueryData([queryKey, parentId]);
    if (Array.isArray(recordList) && recordList.length > 0) {
      duplicateIndex = recordList.findIndex((ele) => ele.userId == user.U_UserId);
    }
    return duplicateIndex;
  };

  /**
   * Sets the selected user info to state
   * @param {Object} U_UserId & UserName
   */
  const handleRecordSelection = (selectedRecord) => {
    console.log("handleRecordSelection: ", JSON.stringify(selectedRecord));
    if (selectedRecord && selectedRecord.U_UserId) {
      if (getDuplicateIndex(selectedRecord) > -1) {
        setWarningMsg(recordType + " already exists!");
        resetUser();
      } else {
        setUser({ userId: selectedRecord.U_UserId, userName: selectedRecord.UserName });
      }
    } else {
      resetUser();
    }
  };

  const RecordDetails = ({ record }) => {
    return <span className="text-sm text-gray-dark font-weight-600">{record.userName}</span>;
  };

  return (
    <ChildRecordsCardWithSaveAll
      recordsPerRow="4"
      displayMode={displayMode}
      setDisplayMode={setDisplayMode}
      recordType={recordType}
      uniqueField={uniqueField}
      // emptyRecord={emptyRecord}
      newRecord={user} //pass this when a value must be added from a Dropdown or Auto-complete textbox or pass `emptyRecord` prop
      resetNewRecord={resetUser}
      title={recordType + "s"}
      subTitle={`${
        displayMode === displayModes.VIEW
          ? `Click Edit to Add or Remove ${recordType}`
          : `Enter a ${recordType} & add`
      }`}
      parentId={parentId}
      primaryKeyField={primaryKeyField}
      queryKey={queryKey}
      getRecordHelper={getStoreUsers}
      createRecordHelper={createStoreUser}
      // updateRecordHelper={updateStoreCounter}
      deleteRecordHelper={deleteStoreUser}
      setSuccessMsg={setSuccessMsg}
      setWarningMsg={setWarningMsg}
      recordDetails={RecordDetails}
      rightContent={
        <PortalUserAutoComplete
          ref={autoCompleteRef}
          handleSelection={handleRecordSelection}
          setWarningMsg={setWarningMsg}
        />
      }
    />
  );
};

export default StoreUsers;
