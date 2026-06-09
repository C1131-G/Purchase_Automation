import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "reactstrap";
import ToastMessage from "../../components/ToastMessage";
import { getCustomerContactPerson } from "./../../helper/customer";
import { statusColors } from "../../config/config";

const CustomerContactPersonDropdown = (props) => {
  const recordType = "Contact Person";
  const [recordList, setRecordList] = useState([]);
  const [warningMsg, setWarningMsg] = useState("");

  const handleChange = (code) => {
    //`rowIndex` sent back when this dropdown is used within a <Table>
    props.handleChange(props.propName, code, props.rowIndex);
  };

  const recordListQuery = useQuery({
    queryKey: ["customerContactPersonList", props.customerCardCode],
    queryFn: async () => {
      const records = await getCustomerContactPerson(props.customerCardCode);
      return records;
    },
    enabled: false,
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
      console.log("recordListQuery.error: ", JSON.stringify(recordListQuery.error));
      setWarningMsg(recordListQuery.error.message);
    }
  }, [recordListQuery.status]);

  useEffect(() => {
    if (props.customerCardCode) {
      recordListQuery.refetch();
    }
  }, [props.customerCardCode]);

  return (
    <>
      {!props.removeLabel && <small className="text-muted">{props.label}</small>}
      <div className={!props.removeMargin ? "mt-1 mb-3" : ""}>
        <Input
          bsSize="sm"
          type="select"
          name="select"
          className={`form-control display-4 text-gray-dark ${
            props.className ? props.className : ""
          }`}
          value={props.value}
          style={props.style}
          onChange={(event) => handleChange(event.target.value)}
          disabled={props.disabled}
        >
          <option value="">
            {!props.customerCardCode
              ? "-- Select a Customer --"
              : recordListQuery.isFetching
                ? "Loading..."
                : recordList.length > 0
                  ? `-- Select a ${recordType} --`
                  : `Not Available`}
          </option>
          {recordList.map((rec) => (
            <option key={rec.ContactCode} value={rec.ContactCode}>
              {rec.Name}
            </option>
          ))}
        </Input>
      </div>
      {warningMsg && <ToastMessage type={statusColors.WARNING} message={warningMsg} />}
    </>
  );
};

export default CustomerContactPersonDropdown;
