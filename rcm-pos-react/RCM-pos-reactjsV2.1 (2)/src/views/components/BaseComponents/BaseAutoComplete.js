import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Typeahead } from "react-bootstrap-typeahead";

/**
 * `Base` component to create `AutoComplete` components.
 * This pulls all the records from the server in a single request, instead of pulling only the matching records
 * as user types the `search key`. Use this when record count is less.
 * @param {*} props recordType, labelField, queryKey, handleSelection, index, size,
    getRecordHelper, setWarningMsg
 */
const BaseAutoComplete = (
  {
    recordType,
    labelField,
    queryKey,
    index,
    size = "sm",
    styles = "",
    handleSelection,
    getRecordHelper,
    setWarningMsg,
    renderMenuItemChildren,
    clearButton = false,
  },
  ref,
) => {
  //NOTE: `ref` is passed as a seperate arg. not as a `prop`

  const [recordList, setRecordList] = useState([]);

  const handleChange = (selected) => {
    // console.log("handleChange - selected: ", selected);
    if (Array.isArray(selected) && selected.length > 0) {
      handleSelection(selected[0], index); //`selected` is always an array of selections, so send the 1st ele.
    } else {
      handleSelection(null, index);
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
      const records = await getRecordHelper();
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
      {styles && <style>{styles}</style>}
      <Typeahead
        ref={ref} //sent from the parent component.
        id={`${queryKey} ${index ? index : ""}`}
        positionFixed={true} //useful when a parent container has `overflow: hidden` set
        size={size ? size : "sm"}
        labelKey={labelField}
        onChange={handleChange}
        options={recordList}
        placeholder={recordListQuery.isFetching ? "Loading..." : "Select a " + recordType}
        // selected={selected}
        renderMenuItemChildren={renderMenuItemChildren}
        clearButton={clearButton}
      />
    </>
  );
};

//Forwarding ref. to Parent component
export default forwardRef(BaseAutoComplete);
