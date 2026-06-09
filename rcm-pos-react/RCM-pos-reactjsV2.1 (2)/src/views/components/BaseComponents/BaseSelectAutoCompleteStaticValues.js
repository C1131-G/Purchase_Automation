import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import CustomSelect from "./CustomSelect";
import { optionsStyle, smSizeStyles, smSizeClassNames } from "./styles/Select";

const BaseSelectAutoCompleteStaticValues = (
  {
    value,
    size = "sm",
    recordType,
    recordList,
    labelField,
    handleSelection,
    setWarningMsg,
    enableMultiSelection = false,
    clearButton = true,
    name,
  },
  ref,
) => {
  //NOTE: `ref` is passed as a seperate arg. not as a `prop`

  const handleChange = (selected) => {
    if (selected) {
      // NOTE: `selected` will be an array ONLY when multi-selection is enabled
      if (Array.isArray(selected) && selected.length > 0) {
        const values = selected.map((ele) => (!labelField ? ele.value : ele));
        handleSelection(values, name);
      } else {
        handleSelection(!labelField ? selected.value : selected, name);
      }
    } else {
      handleSelection(null, name);
    }
  };

  return (
    <>
      <CustomSelect
        ref={ref} //sent from the parent component.
        size={size}
        value={value}
        recordList={recordList}
        labelField={labelField}
        handleChange={handleChange}
        placeholder={"Select a " + recordType}
        isLoading={false}
        enableMultiSelection={enableMultiSelection}
        isClearable={clearButton}
        isSearchable={true}
      />
    </>
  );
};

//Forwarding ref. to Parent component
export default forwardRef(BaseSelectAutoCompleteStaticValues);
