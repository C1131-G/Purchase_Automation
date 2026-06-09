import React, { useState, useContext, useEffect } from "react";
import { UserMinus, UserPlus } from "react-feather";
import { Card, CardBody, Row, Col, CardHeader, Form, Input, FormGroup } from "reactstrap";
import HeaderCard from "../../../../components/Headers/HeaderCardSmall";
import WarehouseDropdown from "../../../components/WarehouseDropdown";
import StoreWarehouseDropDown from "../../../components/AutoComplete/StoreWarehouseDropDown";
import InputWithLabel from "../../../../components/Input/InputWithLabel.js";

import { UserPermissionsContext } from "../../../../contexts/UserPermissionsContext.js";
import { SalesQuotationContext } from "../context/SalesQuotationContext";

const AdditionalDetailsCard2 = ({ setWarningMsg }) => {
  const { userSessionLog, storeWHCode, getLocationBasedDefaultCardCode } =
    useContext(UserPermissionsContext);
  const {
    customer,
    isOneTimeCustomer,
    isCODCustomer,
    warehouseCode,
    setWarehouseCode,
    salesQuotationItems,
    setSalesQuotationItem,
    salesQuotationHeader,
    setSalesQuotationHeader,
    updateSalesQuotationItem,
    taxProp,
  } = useContext(SalesQuotationContext);

  const handleChange = (e) => {
    setSalesQuotationHeader(e.target.name, e.target.value);
  };

  const handleWarehouseChange = (value) => {
    console.log("selectedWarehouse: ", JSON.stringify(value));
    setWarehouseCode(value);
  };

  return (
    <Card className="shadow mb-3">
      {/* <HeaderCard title={"Item"} className="border-0"
        // rightContent={
        //   <WarehouseDropdown
        //     id="invoice-warehouse"
        //     className="ml-2"
        //     style={{ width: "95%" }}
        //     // label={"Warehouse"}
        //     isBranchNotRequired={true}
        //     value={warehouseCode}
        //     handleChange={handleWarehouseChange}
        //     // to get all the fields from the selected WH rec.
        //     returnSelectedRecord={true}
        //     locationCode={userSessionLog.locationCode}
        //   />
        // }
      /> */}
      <CardBody className="pt-0 pb-1 mt-0">
        <div className="flex-nowrap mx--2">
          {userSessionLog.storeId ? (
            <>
              <small className="text-muted">{"Warehouse"}</small>
              <FormGroup className="mt-0 pb--3 mb-1">
                <StoreWarehouseDropDown
                  value={warehouseCode}
                  storeId={userSessionLog.storeId}
                  handleSelection={handleWarehouseChange}
                  setWarningMsg={setWarningMsg}
                />
              </FormGroup>
            </>
          ) : (
            <WarehouseDropdown
              id="invoice-warehouse"
              // className="ml-2"
              // style={{ width: "95%" }}
              label={"Warehouse"}
              isBranchNotRequired={true}
              value={warehouseCode}
              handleChange={handleWarehouseChange}
              // to get all the fields from the selected WH rec.
              returnSelectedRecord={true}
              locationCode={userSessionLog.locationCode}
              // disabled={operation !== displayModes.CREATE}
            />
          )}
          <Row>
            <Col md="12" className="mb--2">
              <FormGroup className="mt--1 pb--3 mb-0">
                <InputWithLabel
                  className="mt--2 pt-1"
                  bsSize="sm"
                  type="text"
                  rows
                  label={"Reference#"}
                  fieldName={"NumAtCard"}
                  value={
                    salesQuotationHeader && salesQuotationHeader.NumAtCard
                      ? salesQuotationHeader.NumAtCard
                      : ""
                  }
                  placeholder={"Enter Reference#"}
                  // displayMode={displayModes.EDIT}
                  handleChange={handleChange}
                />
              </FormGroup>
            </Col>
          </Row>
        </div>
      </CardBody>
    </Card>
  );
};

export default AdditionalDetailsCard2;
