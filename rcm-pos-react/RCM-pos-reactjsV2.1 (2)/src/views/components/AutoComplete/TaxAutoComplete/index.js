import React, { forwardRef } from "react";
import BaseAutoComplete from "../../BaseComponents/BaseAutoComplete";
import { getTaxes } from "../../../../helper/tax";

/**
 *
 * @param {*} props handleSelection, setWarningMsg, index
 */
const TaxAutoComplete = ({ handleSelection, setWarningMsg, index }, ref) => {
  const recordType = "Tax";
  const labelField = "Name";
  const queryKey = "taxList";

  // const getRecordHelper = async () => {
  //   return await getTaxes();
  // }

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
        getRecordHelper={getTaxes}
        setWarningMsg={setWarningMsg}
        clearButton={true}
        renderMenuItemChildren={(option) => (
          <>
            <span>
              {option.Name} &nbsp; <small>{parseFloat(option.Rate).toFixed(2)} %</small>
            </span>
            {/* <span>{option.Code} &emsp; <small>Rate: {parseFloat(option.Rate).toFixed(2)} %</small></span> */}
            {/* <div>
              <small>Rate: {parseFloat(option.Rate).toFixed(2)} %</small>
            </div> */}
          </>
        )}
      />
    </>
  );
};

//Forwarding ref. to Parent component
export default forwardRef(TaxAutoComplete);
