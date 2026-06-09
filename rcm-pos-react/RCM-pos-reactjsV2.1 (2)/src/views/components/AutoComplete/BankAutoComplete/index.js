import React, { forwardRef } from "react";
import BaseAutoComplete from "../../BaseComponents/BaseAutoComplete.js";
import { getBanks } from "../../../../helper/banks.js";

/**
 *
 * @param {*} props handleSelection, setWarningMsg, index
 */
const BankAutoComplete = ({ handleSelection, setWarningMsg, index }, ref) => {
  const recordType = "Bank";
  const labelField = "BankName";
  const queryKey = "bankList";

  // Padding b/w the label & textbox
  const customStyles = `
    .rbt {
      padding-top: 3px;
    }`;

  return (
    <>
      <BaseAutoComplete
        ref={ref}
        index={index}
        styles={customStyles}
        recordType={recordType}
        labelField={labelField}
        queryKey={queryKey}
        handleSelection={handleSelection}
        getRecordHelper={getBanks}
        setWarningMsg={setWarningMsg}
        clearButton={true}
        renderMenuItemChildren={(option) => (
          <>
            <span>{option.BankName}</span>
            {/* <div>
              <small>Code: {option.BankCode}</small>
            </div> */}
          </>
        )}
      />
    </>
  );
};

//Forwarding ref. to Parent component
export default forwardRef(BankAutoComplete);
