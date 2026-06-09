import React, { useState, useEffect } from "react";
import { Input } from "reactstrap";
import { useQuery, refetch } from "@tanstack/react-query";

/**
 * `Base` component to create `AutoComplete` components.
 * This pulls all the records from the server in a single request, instead of pulling only the matching records
 * as user types the `search key`. Use this when record count is less.
 * @param {*} props recordType, labelField, queryKey, handleSelection, index, size,
    getRecords, setWarningMsg, enableMultiSelection
 */
const BaseDropDownWithFilter = ({
  recordType,
  valueField,
  labelField,
  queryKey,
  filter = "",
  size = "sm",
  handleSelection,
  getRecords,
  setWarningMsg,
  propName = "",
  displayValueWithLabel = true,
  value,
  className,
  disabled,
}) => {
  const [recordList, setRecordList] = useState([]);

  const handleChange = (value) => {
    if (value) {
      handleSelection(value, propName);
    } else {
      handleSelection(null, propName);
    }
  };

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
      <Input
        bsSize={size}
        type="select"
        name="select"
        className={`form-control display-4 text-gray-dark ${className}`}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">
          {recordListQuery.isFetching
            ? "Loading..."
            : recordList.length > 0
              ? `Select a ${recordType}`
              : `No records found!`}
        </option>
        {recordList.map((rec) => (
          <option key={rec[valueField]} value={rec[valueField]}>
            {displayValueWithLabel ? `${rec[valueField]} - ${rec[labelField]}` : rec[labelField]}
          </option>
        ))}
      </Input>
    </>
  );
};

export default BaseDropDownWithFilter;
