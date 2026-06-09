import React, { useState, useEffect } from "react";
import { Row, Col, Card, FormGroup, FormFeedback, Input } from "reactstrap";
import InputWithLabel from "../../components/Input/InputWithLabel";
import DisplayMessage from "../../components/DisplayMessage";
import { displayModes, statusColors } from "../../config/config";
import immer from "immer";
import HeaderCardWithTransparentTitle from "../../components/Headers/HeaderCardWithTransparentTitle";
import DropDownComponent from "../components/DropDownComponent";

const StoreDetailsCard = ({
  store,
  selectedStoreIndex,
  setStore,
  storeList,
  displayMode,
  ...props
}) => {
  const [invalidData, setInvalidData] = useState({});

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    if (name === "storeName") {
      if (checkDuplicateName(value) > -1) {
        setInvalidData({ [name]: "Store Name already exists!" });
      } else {
        setInvalidData({});
      }
    }
    const updatedStore = { ...store, [name]: value };
    setStore(updatedStore);
  };

  const checkDuplicateName = (storeName) => {
    console.log("checkDuplicateName - selectedStoreIndex: ", selectedStoreIndex);
    let duplicateIndex = -1;
    if (Array.isArray(storeList) && storeList.length > 0) {
      duplicateIndex = storeList.findIndex(
        (ele, index) => index !== selectedStoreIndex && ele.storeName === storeName,
      );
    }
    return duplicateIndex;
  };
  const handleDropDownChange = (name, valueName, value) => {
    const updatedStore = { ...store, [name]: value, locationCode: valueName };
    setStore(updatedStore);
  };

  useEffect(() => {
    setInvalidData(props.invalidData);
  }, [props.invalidData]);

  return (
    <>
      <Row>
        <Col>
          <HeaderCardWithTransparentTitle title={"Store Details"} />
          <Card className="pl-sm-4 pr-sm-4 pt-sm-1 pb-sm-0 mt--1 mb-3 shadow-xl">
            {" "}
            {/** text-center */}
            <Row className="mt-2 pb-3">
              {Object.keys(store).length > 0 ? (
                <>
                  <Col md="3">
                    <InputWithLabel
                      label="Store Name"
                      placeholder="Enter a Store Name"
                      fieldName="storeName"
                      value={store.storeName ? store.storeName : ""}
                      type="text"
                      displayMode={displayMode}
                      invalidMessage={invalidData.storeName}
                      handleChange={handleFieldChange}
                    />
                  </Col>
                  <Col md="3">
                    <InputWithLabel
                      label="Store Code"
                      placeholder="Enter a Store Code"
                      fieldName="storeCode"
                      value={store.storeCode ? store.storeCode : ""}
                      type="text"
                      displayMode={displayMode}
                      invalidMessage={invalidData.storeCode}
                      handleChange={handleFieldChange}
                    />
                  </Col>
                  <Col md="3">
                    <DropDownComponent
                      label={"Location"}
                      recordType={"Location"}
                      bindField={"Location"}
                      showField={"Location"}
                      module={"STORELOCATION"}
                      propName={"location"}
                      value={store.location}
                      handleChange={handleDropDownChange}
                      disabled={displayMode == "VIEW"}
                    />
                  </Col>
                  {/* <Col md="3">
                  <InputWithLabel
                    label="Location"
                    placeholder="Enter a Location"
                    fieldName="location"
                    value={store.location ? store.location : ""}
                    type="textarea"
                    rows={2}
                    displayMode={displayMode}
                    handleChange={handleFieldChange}
                  />
                </Col> */}
                  <Col md="3">
                    <InputWithLabel
                      label="Description"
                      placeholder="Enter a Description"
                      fieldName="description"
                      value={store.description ? store.description : ""}
                      type="textarea"
                      rows={2}
                      displayMode={displayMode}
                      handleChange={handleFieldChange}
                    />
                  </Col>
                </>
              ) : (
                <Col sm="12">
                  <DisplayMessage
                    type={statusColors.PRIMARY}
                    iconSize={"sm"}
                    message={"No info to display!"}
                  />
                </Col>
              )}
            </Row>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default StoreDetailsCard;
