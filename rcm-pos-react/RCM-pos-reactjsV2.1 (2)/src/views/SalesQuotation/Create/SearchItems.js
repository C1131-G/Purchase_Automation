import React, { useState, useContext, useEffect } from "react";
import { Card, CardBody, Row, Col, CardHeader, Form, Input, FormGroup } from "reactstrap";
import ItemAutoComplete from "../../components/AutoComplete/ItemAutoComplete";

const SearchItems = ({ setItemCode, warehouseCode, cardCode }) => {
  const handleSearch = (selectedItem) => {
    console.log("Searched Item: ", JSON.stringify(selectedItem));
    if (selectedItem.ItemCode) {
      setItemCode(selectedItem.ItemCode);
    }
  };

  return (
    <Card className="shadow mb-3">
      <CardBody className="pt-2 pb-2 mt-0">
        <div className="flex-nowrap mx-0">
          {warehouseCode && (
            <Row>
              <Col>
                <small className="text-muted font-weight-800">Search</small>
                <FormGroup className="mt-1 pb--3 mb-3">
                  <ItemAutoComplete
                    size="sm"
                    placeholder="Enter Item Name, Code or Foreign Name"
                    handleSelection={handleSearch}
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

export default SearchItems;
