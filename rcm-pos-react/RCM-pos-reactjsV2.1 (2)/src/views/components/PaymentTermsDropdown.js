import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "reactstrap";
import ToastMessage from "../../components/ToastMessage.js";
import { getPaymentTerms } from "./../../helper/payment-terms.js";
import { statusColors } from "../../config/config.js";

const PaymentTermsDropdown = (props) => {
  const recordType = "Payment Term";
  const [recordList, setRecordList] = useState([]);
  const [warningMsg, setWarningMsg] = useState("");

  const handleChange = (code) => {
    //`rowIndex` sent back when this dropdown is used within a <Table>
    props.handleChange(props.propName, code, props.rowIndex);
  };

  const recordListQuery = useQuery({
    queryKey: ["paymentTermsList"],
    queryFn: async () => {
      const records = await getPaymentTerms();
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
            <option key={rec.PaymentTermCode} value={rec.PaymentTermCode}>
              {rec.PymntGroup}
            </option>
          ))}
        </Input>
      </div>
      {warningMsg && <ToastMessage type={statusColors.WARNING} message={warningMsg} />}
    </>
  );
};

export default PaymentTermsDropdown;
