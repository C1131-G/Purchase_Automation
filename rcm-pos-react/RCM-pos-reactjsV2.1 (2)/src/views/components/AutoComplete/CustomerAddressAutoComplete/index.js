import React, { forwardRef } from "react";
import BaseAutoCompleteWithFilter from "../../BaseComponents/BaseAutoCompleteWithFilterAddress";
import { getCustomerAddress } from "../../../../helper/customer";

/**
 *
 * @param {*} props customerCardCode, handleSelection, setWarningMsg
 */
const CustomerAddressAutoComplete = (
  { customerCardCode = null, handleSelection, setWarningMsg, value, index, disabled = false },
  ref,
) => {
  const recordType = "Address";
  const labelField = "Address";
  const filterBy = ["Building", "Street", "City"];
  const queryKey = "customerAddressList";

  return (
    <>
      <BaseAutoCompleteWithFilter
        ref={ref}
        recordType={recordType}
        labelField={labelField}
        // to perforrm search based on additional fields, in addition to `labelKey`
        filterBy={filterBy}
        queryKey={queryKey}
        filter={customerCardCode}
        index={index}
        handleSelection={handleSelection}
        value={value}
        getRecords={getCustomerAddress}
        setWarningMsg={setWarningMsg}
        clearButton={true}
        disabled={disabled}
        renderMenuItemChildren={(option) => (
          <>
            <small>{option.Address}</small>
            <div class="text-primary">
              {option.Building && <span>{option.Building},&nbsp;</span>}
              <span>{option.Street},&nbsp;</span>
              <span>{option.City}.</span>
              <br />
              <span>TIN: {option.LicTradNum ? option.LicTradNum : "NA"}</span>
            </div>
          </>
        )}
      />
    </>
  );
};

//Forwarding ref. to Parent component
export default forwardRef(CustomerAddressAutoComplete);
