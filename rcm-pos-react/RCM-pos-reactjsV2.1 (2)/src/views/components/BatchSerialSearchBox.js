import React, { useState, useEffect } from "react";
import { FormGroup, FormFeedback } from "reactstrap";
import DebouncedInput from "../../components/DebouncedInput";
import ToastMessage from "../../components/ToastMessage";
import { getBatchSerialInfo } from "../../helper/items-helper";
import { statusColors } from "../../config/config";

const BatchSerialSearchBox = (props) => {
  const [batchSerialNo, setBatchSerialNo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");

  const handleChange = async (batchSerialNo) => {
    if (batchSerialNo) {
      setIsLoading(true);
      try {
        const record = await getBatchSerialInfo(null, null, batchSerialNo);
        if (record) {
          props.handleScan(record);
          setWarningMsg("");
        } else {
          setWarningMsg("No matching record found!");
        }
      } catch (err) {
        const errMsg = err.response.data.message;
        setWarningMsg(errMsg ? errMsg : JSON.stringify(err));
      } finally {
        setIsLoading(false);
        setBatchSerialNo(""); //Reset `batchSerialNo`
      }
    }
  };

  return (
    <>
      {/* <FormGroup className="mt-0"> */}
      {isLoading ? (
        <span className="form-control form-control-sm text-gray">Searching...</span>
      ) : (
        <DebouncedInput
          bsSize="sm"
          readOnly={false}
          // style={{ width: 80 + "%" }}
          className={"form-control text-gray-dark"} //display-4
          id="batchSerialNo"
          placeholder={"Scan a product"}
          value={batchSerialNo}
          onChange={handleChange}
          delayInMilliseconds={500}
          invalid={warningMsg ? true : false}
        />
      )}
      {/* <FormFeedback>{warningMsg}</FormFeedback>
    </FormGroup> */}
      {warningMsg && <ToastMessage type={statusColors.WARNING} message={warningMsg} />}
    </>
  );
};

export default BatchSerialSearchBox;
