import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "reactstrap";
import ToastMessage from "../../components/ToastMessage";
//import { getWarehousesForBranch } from "./../../helper/bin-warehouse";
import { getLocationWiseWarehouses } from "./../../helper/bin-warehouse";
import { statusColors } from "../../config/config";

const WarehouseDropdown = (props) => {
  const [branchId, setBranchId] = useState(props.branchId);
  const [warehouseCode, setWarehouseCode] = useState("");
  const [warehouseList, setWarehouseList] = useState([]);
  const [warningMsg, setWarningMsg] = useState("");

  const handleChange = (warehouseCode) => {
    // console.log("warehouseCode: ", warehouseCode);
    setWarehouseCode(warehouseCode);

    let value = warehouseCode;
    if (props.returnSelectedRecord) {
      const selectedWarehouse = warehouseList.find(
        (warehouse) => warehouse.WhsCode === warehouseCode,
      );
      value = selectedWarehouse; //{ warehouseCode, warehouseName: selectedWarehouse.WhsName };
    }

    //`rowIndex` sent back when this dropdown is used within a <Table>
    if (props.propName) {
      props.handleChange(props.propName, value, props.rowIndex);
    } else {
      props.handleChange(value, props.rowIndex);
    }
  };

  // const queryKey = props.branchId ? ["warehouseList", props.branchId] : ["warehouseList"];
  const queryKey =
    !props.branchId && props.isBranchNotRequired
      ? ["warehouseList"]
      : ["warehouseList", props.branchId];

  const recordListQuery = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      //const records = await getWarehousesForBranch(props.branchId ? props.branchId : null);
      const records = await getLocationWiseWarehouses(
        props.locationCode ? props.locationCode : null,
      );
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
      setWarehouseList(recordListQuery.data);
    }
  }, [recordListQuery.data]);

  useEffect(() => {
    if (recordListQuery.status === "error") {
      console.log("recordListQuery.error: ", JSON.stringify(recordListQuery.error));
      setWarningMsg(recordListQuery.error.message);
    }
  }, [recordListQuery.status]);

  useEffect(() => {
    if (!props.isBranchNotRequired) {
      if (props.branchId && props.branchId !== branchId) {
        if (!props.branchId) {
          setWarehouseList([]);
        } else {
          recordListQuery.refetch();
        }
        setBranchId(props.branchId);
      }
    }
  }, [props.branchId]);

  useEffect(() => {
    if (props.value !== warehouseCode) {
      setWarehouseCode(props.value);
    }
  }, [props.value]);

  useEffect(() => {
    if (props.isBranchNotRequired || props.branchId) {
      recordListQuery.refetch();
    }
  }, []);

  return (
    <>
      {!props.removeLabel && <small className="text-muted">{props.label}</small>}
      <div className={!props.removeMargin ? "mt-1 mb-3" : ""}>
        <Input
          id={props.id ? props.id : "warehouseDropdown"}
          bsSize="sm"
          type="select"
          name="select"
          className={`form-control display-4 text-gray-dark ${
            props.className ? props.className : ""
          }`}
          value={warehouseCode}
          style={props.style}
          onChange={(event) => handleChange(event.target.value)}
          disabled={props.disabled}
        >
          <option value="">
            {!props.isBranchNotRequired && !props.branchId
              ? "-- Select a Branch --"
              : recordListQuery.isFetching
                ? "Loading..."
                : "-- Select a Warehouse --"}
          </option>
          {warehouseList.map((warehouse) => (
            <option key={warehouse.WhsCode} value={warehouse.WhsCode}>
              {`${warehouse.WhsCode} - ${warehouse.WhsName}`}
            </option>
          ))}
        </Input>
      </div>
      {warningMsg && <ToastMessage type={statusColors.WARNING} message={warningMsg} />}
    </>
  );
};

export default WarehouseDropdown;
