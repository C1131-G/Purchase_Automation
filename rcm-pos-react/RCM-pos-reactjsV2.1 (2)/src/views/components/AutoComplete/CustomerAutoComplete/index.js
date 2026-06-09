import React, { useState, useCallback } from "react";
import { debounce } from "lodash";
import { useQuery } from "@tanstack/react-query";

// https://github.com/ericgio/react-bootstrap-typeahead/blob/HEAD/docs/API.md
import { AsyncTypeahead, Highlighter } from "react-bootstrap-typeahead";
import { displayModes, statusColors } from "../../../../config/config";
import ToastMessage from "../../../../components/ToastMessage";
import { getCustomerInfo } from "../../../../helper/customer";

const CustomerAutoComplete = (props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [warningMsg, setWarningMsg] = useState("");

  const debounceDelay = 500; //in milliseconds

  //Debounce the handleSearch function
  const debouncedHandleSearch = useCallback(
    debounce(async (searchKey) => {
      setIsLoading(true);
      if (searchKey && isNaN(parseInt(searchKey))) {
        searchKey = searchKey.toUpperCase();
      }
      try {
        const filteredOptions = await getCustomerInfo(searchKey, 1, 10);
        // console.log("itemQuery filteredOptions: ", JSON.stringify(filteredOptions) );
        setOptions(filteredOptions);
      } catch (err) {
        setWarningMsg(err);
      } finally {
        setIsLoading(false);
      }
    }, debounceDelay),
    [],
  );

  const handleSearch = (searchKey) => {
    debouncedHandleSearch(searchKey);
  };

  const handleChange = (selected) => {
    if (Array.isArray(selected) && selected.length > 0) {
      props.handleSelection(selected[0]); //`selected` is always an array of selections, so send the 1st ele.

      //Reset the text box as soon as a value is selected from the suggestions
      // setSelected([]);
    } else {
      props.handleSelection(null);
    }
  };

  // Bypass client-side filtering by returning `true`. Results are already
  // filtered by the search endpoint, so no need to do it again.
  const filterBy = () => true;

  return (
    <>
      <AsyncTypeahead
        size={props.size}
        disabled={props.disabled}
        id="customer-list"
        labelKey="CardName"
        placeholder={props.placeholder ? props.placeholder : "Enter Customer Name or Contact#"}
        newSelectionPrefix={"Add New: "}
        //delay={200} //Delay, in milliseconds, before performing search
        // selected={selected}
        useCache={false} //Whether or not the component should cache query results
        allowNew={props.allowNew === undefined ? true : props.allowNew}
        filterBy={filterBy}
        isLoading={isLoading}
        minLength={3}
        onSearch={handleSearch}
        onChange={handleChange}
        options={options}
        caseSensitive={false}
        clearButton={true}
        flip={true} //automatically adjust the position of the menu when it reaches the viewport boundaries
        // highlightOnlyResult={true} //`highlightOnlyResult` will not work with `allowNew`
        // size="sm"
        // inputProps={} //Props to be applied directly to the input. onBlur, onChange, onFocus, and onKeyDown are ignored
        renderMenuItemChildren={(option, props, idx) => (
          <>
            <span>Code: {option.CardCode}</span>
            <div>
              <small>{option[props.labelKey]}</small> <br />
              {/* <small>Mobile#: {option.Cellular}</small> <br /> */}
              {/* Type NOT Required anymore, as it's always going to be B2B
               <small>Type: {option.U_CustomerType}</small> */}
            </div>
          </>
        )}
      />
      {warningMsg && <ToastMessage type={statusColors.WARNING} message={warningMsg} />}
    </>
  );
};

export default CustomerAutoComplete;
