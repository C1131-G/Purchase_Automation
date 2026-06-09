import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "reactstrap";
import ToastMessage from "../../components/ToastMessage.js";
import { getComponentList } from "../../helper/common-component.js";
import { statusColors } from "../../config/config.js";

const DropDownComponent = (props) => {
  const recordType = props.recordType;
  const [recordList, setRecordList] = useState([]);
  const [warningMsg, setWarningMsg] = useState("");

  const handleChange = (code) => {
    if (props.propName == "location") {
      let selected = recordList.filter((x) => x[props.showField] === code);
      if (selected != null && selected.length > 0) {
        let valueName = selected[0].Code;
        props.handleChange(props.propName, valueName, code);
      } else {
        props.handleChange(props.propName, code);
      }
    } else if (props.propName == "ItemsGroupCode") {
      let selected = recordList.filter((x) => x[props.bindField] === Number(code));
      if (selected != null && selected.length > 0) {
        let valueName = selected[0][props.showField];
        props.handleChange(props.propName, code, valueName);
      } else {
        props.handleChange(props.propName, code);
      }
    } else {
      props.handleChange(props.propName, code);
    }
  };

  const recordListQuery = useQuery({
    queryKey: [props.module],
    queryFn: async () => {
      const records = await getComponentList(props.filters, props.module);
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
            <option key={rec[props.bindField]} value={rec[props.bindField]}>
              {rec[props.showField]}
            </option>
          ))}
        </Input>
      </div>
      {warningMsg && <ToastMessage type={statusColors.WARNING} message={warningMsg} />}
    </>
  );
};

export default DropDownComponent;
