import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useQuery, refetch } from "@tanstack/react-query";
import CustomSelect from "./CustomSelect";

/**
 * `Base` component to create `AutoComplete` components.
 * This pulls all the records from the server in a single request, instead of pulling only the matching records
 * as user types the `search key`. Use this when record count is less.
 * @param {*} props recordType, labelField, queryKey, handleSelection, index, size,
    getRecords, setWarningMsg, enableMultiSelection
 */
const BaseSelectAutoCompleteWithFilter = (
  {
    recordType,
    labelField,
    queryKey,
    filter = "",
    size = "sm",
    handleSelection,
    getRecords,
    setWarningMsg,
    enableMultiSelection = false,
    name,
    value,
    clearButton = true,
  },
  ref,
) => {
  //NOTE: `ref` is passed as a seperate arg. not as a `prop`

  const [recordList, setRecordList] = useState([]);

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

  /**
   * Clears the selection from the search box
   */
  // const clearSelection = () => {
  //   if(ref.current) {
  //     ref.current.clear();
  //   }
  // }

  /**
   * Expose the clearSelection function (to Parent comps.) via the ref callback
   */
  // useImperativeHandle(ref, () => ({
  //   clearSelection,
  // }));

  const recordListQuery = useQuery({
    queryKey: [queryKey, filter],
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
    if (filter) {
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

  return (
    <>
      {/* <Typeahead
        ref={ref} //sent from the parent component.
        id={`${queryKey} ${index ? index : ""}`}
        positionFixed={true} //useful when a parent container has `overflow: hidden` set
        size={size ? size : "sm"}
        labelKey={labelField}
        onChange={handleChange}
        options={recordList}
        placeholder={recordListQuery.isFetching ? "Loading..." : "Select a "+recordType}
        selected={value && !Array.isArray(value) ? [value] : value} //this prop expects an Array value
        multiple={enableMultiSelection}
        renderMenuItemChildren={renderMenuItemChildren}
        clearButton={clearButton}
        open={undefined}
      /> */}

      <CustomSelect
        ref={ref} //sent from the parent component.
        size={size}
        value={value}
        recordList={recordList}
        labelField={labelField}
        handleChange={handleChange}
        placeholder={recordListQuery.isFetching ? "Loading..." : "Select a " + recordType}
        isLoading={recordListQuery.isFetching}
        enableMultiSelection={enableMultiSelection}
        isClearable={clearButton}
        isSearchable={true}
      />
    </>
  );
};

//Forwarding ref. to Parent component
export default forwardRef(BaseSelectAutoCompleteWithFilter);
