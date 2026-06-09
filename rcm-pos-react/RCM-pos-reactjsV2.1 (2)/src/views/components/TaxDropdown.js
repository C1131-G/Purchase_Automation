import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "reactstrap";
import ToastMessage from "../../components/ToastMessage.js";
import { getTaxes } from "./../../helper/tax.js";
import { statusColors } from "../../config/config.js";

const TaxDropdown = (props) => {
  const recordType = "Tax";
  const [recordList, setRecordList] = useState([]);
  const [warningMsg, setWarningMsg] = useState("");

  const handleChange = (code) => {
    let value = code;
    if (props.returnSelectedRecord) {
      const selectedRecord = recordList.find((rec) => rec.Code === code);
      value = selectedRecord;
    }
    //`rowIndex` sent back when this dropdown is used within a <Table>
    props.handleChange(props.propName, value, props.rowIndex);
  };

  const recordListQuery = useQuery({
    queryKey: ["taxList"],
    queryFn: async () => {
      const records = await getTaxes();
      return records;
    },
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
      console.log("recordListQuery.error: ", JSON.stringify(recordListQuery.error));
      setWarningMsg(recordListQuery.error.message);
    }
  }, [recordListQuery.status]);

  return (
    <>
      {!props.removeLabel && <small className="text-muted">{props.label}</small>}
      <div className={!props.removeMargin ? "mt-1 mb-3" : ""}>
        <Input
          id={props.id ? props.id : "taxDropdown"}
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
            {recordListQuery.isFetching
              ? "Loading..."
              : recordList.length > 0
                ? `-- Select a ${recordType} --`
                : `Not Available`}
          </option>
          {recordList.map((rec) => (
            <option key={rec.Code} value={rec.Code}>
              {parseFloat(rec.Rate).toFixed(2)}% - {rec.Name}
            </option>
          ))}
        </Input>
      </div>
      {warningMsg && <ToastMessage type={statusColors.WARNING} message={warningMsg} />}
    </>
  );
};

export default TaxDropdown;
