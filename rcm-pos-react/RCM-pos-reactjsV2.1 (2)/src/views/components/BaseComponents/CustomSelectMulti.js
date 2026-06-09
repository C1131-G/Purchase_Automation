import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import Select from "react-select";
import { optionsStyle, smSizeStyles, smSizeClassNames } from "./styles/Select";

/**
 *
 * @param {*} props size, recordList, labelField, handleChange, placeholder, enableMultiSelection, isClearable, isLoading
 * @param {*} ref
 * @returns
 */
const CustomSelect = (
  {
    size,
    value = [],
    recordList,
    labelField,
    handleChange,
    placeholder,
    enableMultiSelection = false,
    isClearable = true,
    isLoading = false,
    isSearchable = true,
  },
  ref,
) => {
  //NOTE: `ref` is passed as a seperate arg. not as a `prop`

  const [customStyles, setCustomStyles] = useState(optionsStyle);
  const [customClassNames, setCustomClassNames] = useState("");
  const [options, setOptions] = useState([]);
  const [selectedValue, setSelectedValue] = useState([]);

  useEffect(() => {
    if (size === "sm") {
      setCustomClassNames(smSizeClassNames);
      setCustomStyles({ ...customStyles, ...smSizeStyles });
    }
  }, [size]);

  const isArrayOfStrings = (options) => {
    return options.length > 0 && typeof options[0] === "string";
  };

  useEffect(() => {
    // Transform the recs. in a format that's compatiable with <Select>
    // if(isArrayOfStrings(recordList)) {

    // If lableField is not set, it means the recordList is an array of strings
    if (!labelField) {
      const options = recordList.map((option) => ({
        label: option,
        value: option,
      }));

      setOptions(options);
    } else {
      setOptions(recordList);
    }
  }, [recordList]);

  useEffect(() => {
    // console.log("CustomSelectMulti - value: ", value);
    if (Array.isArray(value) && value.length > 0) {
      let selectedValue = [];
      if (!labelField) {
        selectedValue = value.map((option) => ({
          label: option,
          value: option,
        }));
      } else {
        selectedValue = value.map((option) => ({
          [labelField]: option,
          value: option,
        }));
      }
      setSelectedValue(selectedValue);
    } else {
      setSelectedValue("");
    }
  }, [value]);

  return (
    <>
      <Select
        classNamePrefix="select"
        // defaultValue={colourOptions[0]}
        // value={(labelField && value) ? value : (!labelField && value) ? { label: value, value } : ""}
        value={selectedValue}
        name={labelField}
        isLoading={isLoading}
        getOptionLabel={(option) => (labelField ? option[labelField] : option.label)}
        // getOptionValue={(option) => option.url}
        onChange={handleChange}
        options={options}
        placeholder={placeholder}
        isMulti={enableMultiSelection}
        isClearable={isClearable}
        isSearchable={isSearchable}
        styles={customStyles}
        classNames={customClassNames}

        // theme={(theme) => ({
        //   ...theme,
        //   borderRadius: 0,
        //   colors: {
        //     ...theme.colors,
        //     primary25: "white",
        //     primary: "gray",
        //   },
        // })}
      />
    </>
  );
};

//Forwarding ref. to Parent component
export default forwardRef(CustomSelect);
