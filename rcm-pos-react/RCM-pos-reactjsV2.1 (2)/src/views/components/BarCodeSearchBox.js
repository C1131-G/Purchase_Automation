import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FormGroup, FormFeedback } from "reactstrap";
import DebouncedInput from "../../components/DebouncedInput";
import { getItemsWithBarcode } from "../../helper/bin-warehouse.js";
import { statusColors, isBranchEnabled } from "../../config/config";

const BarCodeSearchBox = (props) => {
  const [barCode, setBarCode] = useState("");
  const [itemCode, setItemCode] = useState("");

  const handleChange = async (barCode) => {
    if (props.warehouseCode) {
      setBarCode(barCode ? barCode.trim() : "");
    } else {
      setBarCode("");
      props.setWarningMsg("Select a Warehouse!");
    }
  };

  let queryKey;
  let filters = { warehouseCode: props.warehouseCode };

  if (barCode) {
    filters.barCode = barCode;
  } else if (props.itemCode) {
    filters.itemCode = props.itemCode;
  }
  if (props.branch && isBranchEnabled) {
    filters.branch = props.branch;
  }
  filters.cardCode = props.cardCode;

  const recordListQuery = useQuery({
    queryKey: [
      "itemWithBarcode",
      props.warehouseCode,
      "barCode",
      barCode,
      "itemCode",
      props.itemCode,
    ],
    queryFn: async () => {
      const records = await getItemsWithBarcode(filters);
      return records;
    },
    //Disable the query by default
    enabled: false,
    staleTime: 1000 * 60 * 60, //time in milliseconds after which the data is considered stale
    refetchOnWindowFocus: false,
  });

  //componentDidUpdate - set the query results to state
  useEffect(() => {
    if (recordListQuery.status === "success") {
      if (Array.isArray(recordListQuery.data) && recordListQuery.data.length > 0) {
        props.handleScan(recordListQuery.data[0]);
      } else {
        props.setWarningMsg("Item not available in the Store!");
      }
      setBarCode("");
    }
  }, [recordListQuery.data]);

  useEffect(() => {
    if (recordListQuery.status === "error") {
      console.log("recordListQuery.error: ", JSON.stringify(recordListQuery.error));
      props.setWarningMsg(recordListQuery.error.message);
    }
  }, [recordListQuery.status]);

  useEffect(() => {
    if (barCode || props.itemCode) {
      recordListQuery.refetch();
    }
  }, [barCode, props.itemCode]);

  // useEffect(() => {
  //   if(props.itemCode) {
  //     setItemCode(props.itemCode);
  //   }
  // }, [props.itemCode]);

  return (
    <>
      {/* <span className="form-control form-control-sm text-gray">Searching...</span> */}
      <DebouncedInput
        icon="fa fa-barcode" //qrcode
        addonType="append"
        iconSize="lg"
        bsSize="sm"
        readOnly={false}
        // style={{ width: 80 + "%" }}
        className={"form-control text-gray-dark"} //display-4
        id="barCode"
        placeholder={recordListQuery.isFetching ? "Searching..." : "Scan products"}
        value={barCode}
        onChange={handleChange}
        delayInMilliseconds={500}
        // invalid={warningMsg ? true : false}
      />
      {/* {recordListQuery.isFetching &&
        <small className="my-2 text-primary">Searching...</small>
      } */}
    </>
  );
};

export default BarCodeSearchBox;
