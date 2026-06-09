import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useQuery, refetch } from "@tanstack/react-query";
import { Typeahead } from "react-bootstrap-typeahead";

/**
 * `Base` component to create `AutoComplete` components.
 * This pulls all the records from the server in a single request, instead of pulling only the matching records
 * as user types the `search key`. Use this when record count is less.
 * @param {*} props recordType, labelField, queryKey, handleSelection, index, size,
    getRecords, setWarningMsg, enableMultiSelection
 */
const BaseAutoCompleteWithFilter = (
  {
    id = "",
    recordType,
    labelField,
    queryKey,
    filter = "",
    fetchWithoutFilter = false,
    index,
    size,
    handleSelection,
    getRecords,
    setWarningMsg,
    renderMenuItemChildren,
    enableMultiSelection = false,
    name,
    value = "",
    filterBy = [],
    clearButton = true,
  },
  ref,
) => {
  //NOTE: `ref` is passed as a seperate arg. not as a `prop`

  const [recordList, setRecordList] = useState([]);
  const [selected, setSelected] = useState([]);

  const handleChange = (selected) => {
    if (Array.isArray(selected) && selected.length > 0) {
      handleSelection(enableMultiSelection ? selected : selected[0], name, index); //`selected` is always an array of selections, so send the 1st ele.
    } else {
      handleSelection(null, name, index);
    }
  };

  /**
   * Clears the selection from the search box
   */
  const clearSelection = () => {
    if (ref?.current) {
      ref.current.clear();
    }
  };

  /**
   * Expose the clearSelection function (to Parent comps.) via the ref callback
   */
  // useImperativeHandle(ref, () => ({
  //   clearSelection,
  // }));

  // When a filter is not passed & fetchWithoutFilter
  const key = !filter && fetchWithoutFilter ? [queryKey] : [queryKey, filter];
  const recordListQuery = useQuery({
    queryKey: key,
    queryFn: async () => {
      const records = await getRecords(filter);
      return records;
    },
    // Setting this to `false` will disable this query from automatically running. Trigger it manually using `refetch()`
    enabled: false,
    staleTime: 1000 * 60 * 60, //time in milliseconds after which the data is considered stale
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    // console.log("filter - useEffect: ", filter);
    if (filter || fetchWithoutFilter) {
      recordListQuery.refetch();
    }
  }, [filter]);

  //componentDidUpdate - set the query results to state
  useEffect(() => {
    if (recordListQuery.status === "success") {
      setRecordList(recordListQuery.data);
    }
  }, [recordListQuery.data]);

  useEffect(() => {
    if (recordListQuery.status === "error") {
      console.log(
        "recordListQuery: ",
        JSON.stringify(recordListQuery.error?.response?.data?.message),
      );
      setWarningMsg(recordListQuery.error.response?.data?.message);
    }
  }, [recordListQuery.status]);

  const getValue = (value) => {
    console.log("getValue - value: ", value);
    if (value) {
      if (Array.isArray(value)) return value;
      else return [value];
    } else {
      return [];
    }
  };

  // useEffect(() => {
  //   if(value) {
  //     setSelected(getValue(value));
  //   }
  //   else {
  //     clearSelection();
  //   }
  // }, [value]);

  return (
    <>
      <Typeahead
        ref={ref} //sent from the parent component.
        id={id ? id : `${queryKey} ${index ? index : ""}`}
        positionFixed={true} //useful when a parent container has `overflow: hidden` set
        size={size ? size : "sm"}
        labelKey={labelField}
        // to perforrm search based on additional fields, in addition to `labelKey`
        filterBy={filterBy}
        onChange={handleChange}
        options={recordList}
        placeholder={recordListQuery.isFetching ? "Loading..." : "Select a " + recordType}
        // selected={value && !Array.isArray(value) ? [value] : value} //this prop expects an Array value
        // selected={selected} // With this enabled clicking `x` doesn't clear the selected value
        multiple={enableMultiSelection}
        renderMenuItemChildren={renderMenuItemChildren}
        clearButton={clearButton}
        open={undefined}
      />
    </>
  );
};

//Forwarding ref. to Parent component
export default forwardRef(BaseAutoCompleteWithFilter);
