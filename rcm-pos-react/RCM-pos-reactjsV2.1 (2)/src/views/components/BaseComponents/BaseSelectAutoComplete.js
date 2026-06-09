import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useQuery } from "@tanstack/react-query";
import CustomSelect from "./CustomSelect";

/**
 * `Base` component to create `AutoComplete` components.
 * This pulls all the records from the server in a single request, instead of pulling only the matching records
 * as user types the `search key`. Use this when record count is less.
 * @param {*} props recordType, labelField, queryKey, handleSelection, index, size,
    getRecords, setWarningMsg, enableMultiSelection
 */
const BaseSelectAutoComplete = (
  {
    recordType,
    labelField,
    queryKey,
    size = "sm",
    handleSelection,
    getRecords,
    setWarningMsg,
    value,
    enableMultiSelection = false,
    clearButton = false,
    name,
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
    queryKey: [queryKey],
    queryFn: async () => {
      const records = await getRecords();
      return records;
    },
    // Setting this to `false` will disable this query from automatically running
    //Enable the query by default
    enabled: true,
    staleTime: 1000 * 60 * 60, //time in milliseconds after which the data is considered stale
    refetchOnWindowFocus: false,
  });

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
      <CustomSelect
        ref={ref} //sent from the parent component.
        value={value}
        size={size}
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
export default forwardRef(BaseSelectAutoComplete);
