import React, { forwardRef } from "react";
import BaseAutoComplete from "../../BaseComponents/BaseAutoComplete";
import { getPortalUsers } from "../../../../helper/user-helper";

/**
 *
 * @param {*} props handleSelection, setWarningMsg
 */
const PortalUserAutoComplete = ({ handleSelection, setWarningMsg }, ref) => {
  //NOTE: `ref` is passed as a seperate arg. not as a `prop`
  const recordType = "User";
  const labelField = "UserName";
  const queryKey = "portalUserList";

  return (
    <>
      <BaseAutoComplete
        ref={ref}
        recordType={recordType}
        labelField={labelField}
        queryKey={queryKey}
        handleSelection={handleSelection}
        getRecordHelper={getPortalUsers}
        setWarningMsg={setWarningMsg}
        clearButton={true}
      />
    </>
  );
};

//Forwarding ref. to Parent component
export default forwardRef(PortalUserAutoComplete);
