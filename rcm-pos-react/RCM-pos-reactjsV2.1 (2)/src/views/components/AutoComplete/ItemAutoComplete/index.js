import React, { useState, useCallback } from "react";
import { debounce } from "lodash";
import { useQuery } from "@tanstack/react-query";
import { AsyncTypeahead } from "react-bootstrap-typeahead";
import { displayModes, statusColors } from "../../../../config/config";
import ToastMessage from "../../../../components/ToastMessage";
import { getItems } from "../../../../helper/items-helper";

const ItemAutoComplete = (props) => {
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
        const filteredOptions = await getItems(searchKey, 1);
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
    debouncedHandleSearch(searchKey.trim());
  };

  const handleChange = (selected) => {
    if (Array.isArray(selected) && selected.length > 0) {
      props.handleSelection(selected[0]); //`selected` is always an array of selections, so send the 1st ele.

      //Reset the text box as soon as a value is selected from the suggestions
      setSelected([]);
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
        id="item-list"
        labelKey="ItemName"
        placeholder={props.placeholder ? props.placeholder : "Enter Item Name or Code"}
        emptyLabel="No matches found!"
        //delay={200} //Delay, in milliseconds, before performing search
        selected={selected}
        useCache={true} //Whether or not the component should cache query results
        filterBy={filterBy}
        isLoading={isLoading}
        minLength={3}
        maxResults={10}
        paginate={true} // Enable pagination
        onSearch={handleSearch}
        onChange={handleChange}
        options={options}
        caseSensitive={false}
        // clearButton={true}
        flip={true} //automatically adjust the position of the menu when it reaches the viewport boundaries
        highlightOnlyResult={true}
        // size="sm"
        // inputProps={} //Props to be applied directly to the input. onBlur, onChange, onFocus, and onKeyDown are ignored
        renderMenuItemChildren={(option) => (
          <>
            <span>{option.ItemName}</span>
            <div>
              <small>
                Item Code: <b>{option.ItemCode}</b>
              </small>
              {option.FrgnName && (
                <>
                  &nbsp;|&nbsp;
                  <small>
                    Foreign Name: <b>{option.FrgnName}</b>
                  </small>
                </>
              )}
            </div>
          </>
        )}
      />
      {warningMsg && <ToastMessage type={statusColors.WARNING} message={warningMsg} />}
    </>
  );
};

export default ItemAutoComplete;
