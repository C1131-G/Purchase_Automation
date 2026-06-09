import React, { useState, useContext, useEffect } from "react";
import { Card, CardBody, Row, Col, CardHeader, Form, Input, FormGroup } from "reactstrap";
import BarCodeSearchBox from "../../components/BarCodeSearchBox";
import ItemAutoComplete from "../../components/AutoComplete/ItemAutoComplete";

import { UserPermissionsContext } from "../../../contexts/UserPermissionsContext.js";
import { SalesContext } from "./context/SalesContext";

import { handleItemScan } from "../../common-utils/item.util.js";

const ScanItems = ({ itemCode, setItemCode, warehouseCode, cardCode, setWarningMsg }) => {
  const { userSessionLog, getLocationBasedDefaultCardCode } = useContext(UserPermissionsContext);
  const {
    customer,
    isOneTimeCustomer,
    isCODCustomer,
    setWarehouseCode,
    salesItems,
    setSalesItem,
    salesHeader,
    setSalesHeader,
    updateSalesItem,
    taxProp,
  } = useContext(SalesContext);

  const handleScan = async (scannedItem) => {
    setItemCode("");
    // handleItemScan(scannedItem);
    await handleItemScan(
      scannedItem,
      salesItems,
      setSalesItem,
      updateSalesItem,
      taxProp,
      customer,
      isOneTimeCustomer,
      isCODCustomer,
      getLocationBasedDefaultCardCode,
    );
  };

  return (
    <Card className="shadow mb-3">
      <CardBody className="pt-2 pb-2 mt-0">
        <div className="flex-nowrap mx-0">
          {/* <Input className="form-control" type="search" placeholder="Enter Item Name or Scan Barcode.." />
          <span className="text-white btn-primary input-group-text">Scan</span> */}
          {warehouseCode && (
            <Row>
              <Col>
                <small className="text-muted font-weight-800">Scan</small>
                <FormGroup className="mt-1 pb--3 mb-3">
                  <BarCodeSearchBox
                    size="sm"
                    warehouseCode={warehouseCode} //storeWHCode
                    itemCode={itemCode}
                    cardCode={cardCode}
                    branch={userSessionLog?.locationDefaults?.Branch}
                    handleScan={handleScan}
                    setWarningMsg={setWarningMsg}
                  />
                </FormGroup>
              </Col>
            </Row>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default ScanItems;
