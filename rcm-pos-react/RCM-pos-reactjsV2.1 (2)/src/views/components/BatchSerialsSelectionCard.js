import React, { useState, useEffect } from "react";
import classnames from "classnames";
// reactstrap components
import {
  Button,
  Card,
  FormGroup,
  Input,
  InputGroupAddon,
  InputGroupText,
  Row,
  Col,
  Modal,
  Table,
  InputGroup,
} from "reactstrap";
import { PlusSquare } from "react-feather";

import { formatDate } from "../../config/util.js";
import { itemRequestType } from "../../config/config.js";

import { getBatchSerialInfo } from "../../helper/items-helper.js";

const BatchSerialsSelectionCard = ({
  itemsList,
  selectedItemCode,
  displayWHBinColumns = false,
  deletedBatchSerialRec,
  resetDeletedBatchSerialRec,
  addScannedBatchSerialItemToRow,
}) => {
  const [oldBatchSerialItemsList, setOldBatchSerialItemsList] = useState([]);
  const [filteredOldBatchSerialItemsList, setFilteredOldBatchSerialItemsList] = useState([]);
  const [warningMsg, setWarningMsg] = useState("");

  const loadRecords = async () => {
    try {
      if (!Array.isArray(oldBatchSerialItemsList) || !oldBatchSerialItemsList.length) {
        const response = await getBatchSerialInfo(itemsList, itemRequestType.ITEM_WITHOUT_QRCODE);
        if (response) {
          setOldBatchSerialItemsList(response);
          setFilteredOldBatchSerialItemsList(response);
        } else {
          setWarningMsg("No Batch/Serials found for the added items");
        }
      }
    } catch (err) {
      setWarningMsg(err.message);
    }
  };

  const handleItemSearch = (searchKey) => {
    console.log(`handleItemSearch - ${searchKey}`);
    let filteredItems = [];

    if (isNaN(searchKey)) {
      searchKey = searchKey.toUpperCase();
    }

    oldBatchSerialItemsList.forEach((item) => {
      if (
        item.ItemCode.toString().indexOf(searchKey) > -1 ||
        item.WhsCode.toUpperCase().indexOf(searchKey) > -1 ||
        (item.BatchNumber && item.BatchNumber.toUpperCase().indexOf(searchKey) > -1) ||
        (item.BatchNumberProperty &&
          item.BatchNumberProperty.toUpperCase().indexOf(searchKey) > -1) ||
        (item.InternalSerialNumber &&
          item.InternalSerialNumber.toUpperCase().indexOf(searchKey) > -1)
      ) {
        filteredItems.push(item);
      }
    });

    setFilteredOldBatchSerialItemsList(filteredItems);
  };

  const handleBatchSerialsSelection = (index, selectedItem, isSelected) => {
    if (isSelected) {
      const isSelectedRecAdded = addScannedBatchSerialItemToRow(selectedItem);
      console.log("isSelectedRecAdded: ", isSelectedRecAdded);
      if (isSelectedRecAdded) {
        // Need to set `isSelected` as `false` when an item is deleted from the parent comp.
        // Need work! So keeping this on-hold for now. At this point, below two code block is NOT Required at all.
        // setFilteredOldBatchSerialItemsList((prevList) =>
        //   prevList.map((item, i) =>
        //     i === index ? { ...item, isSelected: true } : item
        //   )
        // );

        const updatedFilteredOldBatchSerialItemsList = filteredOldBatchSerialItemsList.map(
          (item, i) => (i === index ? { ...item, isSelected: true } : item),
        );
        setFilteredOldBatchSerialItemsList(updatedFilteredOldBatchSerialItemsList);

        setOldBatchSerialItemsList((prevList) =>
          prevList.map((item) =>
            (item.ItemCode === selectedItem.ItemCode &&
              item.BatchNumber &&
              item.BatchNumber === selectedItem.BatchNumber) ||
            (item.InternalSerialNumber &&
              item.InternalSerialNumber === selectedItem.InternalSerialNumber)
              ? { ...item, isSelected: true }
              : item,
          ),
        );
      }
    }
  };

  useEffect(() => {
    if (selectedItemCode && itemsList.length) {
      loadRecords();
    }
  }, [selectedItemCode, itemsList]);

  /**
   * Unselect the selected Batch-Serial rec. that's deleted from the `Selected` table & return the list
   * @param {*} itemsList
   * @param {*} deletedBatchSerialRec
   * @returns
   */
  const getUnselectedBatchSerialNumbers = (itemsList, deletedBatchSerialRec) => {
    try {
      const updatedItemsList = itemsList.map((item) =>
        (item.isSelected === true &&
          item.ItemCode === deletedBatchSerialRec.ItemCode &&
          item.WhsCode === deletedBatchSerialRec.WhsCode &&
          item.BinAbsEntry === deletedBatchSerialRec.BinAbsEntry &&
          item.BatchNumber &&
          item.BatchNumber === deletedBatchSerialRec.BatchNumber) ||
        (item.BatchNumberProperty &&
          item.BatchNumberProperty === deletedBatchSerialRec.BatchNumber) ||
        (item.InternalSerialNumber &&
          item.InternalSerialNumber === deletedBatchSerialRec.InternalSerialNumber)
          ? { ...item, isSelected: false }
          : item,
      );
      return updatedItemsList;
    } catch (err) {
      throw err;
    }
  };

  const addDeletedBatchSerialToAvailableList = (deletedBatchSerialRec) => {
    try {
      // un-select the selected Batch-Serial rec. that's deleted from the `Selected` table
      const updatedFilteredOldBatchSerialItemsList = getUnselectedBatchSerialNumbers(
        filteredOldBatchSerialItemsList,
      );
      setFilteredOldBatchSerialItemsList(updatedFilteredOldBatchSerialItemsList);

      const updatedOldBatchSerialItemsList =
        getUnselectedBatchSerialNumbers(oldBatchSerialItemsList);
      setOldBatchSerialItemsList(updatedOldBatchSerialItemsList);

      // Remove the `deletedBatchSerialRec` data in the parent comp.'s `state`
      resetDeletedBatchSerialRec();
    } catch (err) {
      setWarningMsg(err?.message);
    }
  };

  useEffect(() => {
    console.log("BatchSerialsSelectionCard - deletedBatchSerialRec: ", deletedBatchSerialRec);
    if (deletedBatchSerialRec) {
      addDeletedBatchSerialToAvailableList(deletedBatchSerialRec);
    }
  }, [deletedBatchSerialRec]);

  const itemsTableHeadForPopup = ["", "In Date", "Batch/Serial#", "Item No.", "Qty", "Select"];

  if (displayWHBinColumns) {
    itemsTableHeadForPopup.splice(4, 0, "Warehouse", "Bin");
  }

  // const batchSerialItemsList = filteredOldBatchSerialItemsList.filter(item => item.ItemCode === selectedItemCode);

  const recordCount = filteredOldBatchSerialItemsList.filter(
    (item) => item.ItemCode === selectedItemCode && !item.isSelected,
  ).length;

  return (
    <>
      <div>
        <Row className="ml-2 mt-2">
          {warningMsg && (
            <span className="text-warning mr-20 small">
              <i className="fa fa-exclamation-triangle" /> &nbsp;
              {warningMsg}
            </span>
          )}
        </Row>
      </div>
      <Card className="border-0">
        <Row className="mx-0 my-0">
          <Col md="10">
            <h4 className="text-left">Available Batch & Serial Numbers</h4>
          </Col>
          <Col md="2" className="text-right">
            <h5 className="font-dark">
              Count: <span className="text-primary font-weight-800">{recordCount}</span>
            </h5>
          </Col>
          {/* <Col md="12">
            <i className="fa fa-info-circle text-primary" /> &nbsp;
            <small className="font-weight-600">Select the required Batch, Serials Nos.</small>
          </Col> */}
          {/* <Col sm="2" className="text-right mt-2">
            <Button
              color="primary"
              style={{ zIndex: "1010", position: "fixed", top: "50px", right: "20px" }}
              onClick={toggleOldItemsModal}
              size="sm"
            >
              Done
            </Button>
          </Col> */}
        </Row>
        <Row>
          <Col md="8">
            <FormGroup className={classnames({ focused: warningMsg })}>
              <InputGroup className="input-group mb--2 ml-0 pl-2 mt-0" size="sm">
                <InputGroupAddon addonType="prepend">
                  <InputGroupText>
                    <i className="ni ni-zoom-split-in" />
                  </InputGroupText>
                </InputGroupAddon>
                <Input
                  placeholder="Search"
                  type="text"
                  onFocus={() => setWarningMsg("")}
                  onBlur={() => setWarningMsg("")}
                  onKeyUp={(e) => handleItemSearch(e.target.value)}
                />
              </InputGroup>
            </FormGroup>
          </Col>
        </Row>
      </Card>
      <div className="mt--2 table-fixed-head table-fixed-head-lg table-fixed-head-resize">
        <Table size="sm" className="align-items-center table-flush" responsive>
          <thead className="thead-light">
            <tr>
              {itemsTableHeadForPopup.map((headerCol, key) =>
                headerCol === "Qty" ? (
                  <th scope="col" key={key}>
                    {" "}
                    {/** className="w-25" */}
                    {headerCol}
                  </th>
                ) : (
                  <th scope="col" key={key}>
                    {headerCol}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {Array.isArray(filteredOldBatchSerialItemsList) &&
            filteredOldBatchSerialItemsList.length
              ? filteredOldBatchSerialItemsList.map((item, key) => {
                  if (item.ItemCode === selectedItemCode && !item.isSelected) {
                    return (
                      <tr
                        key={`${item.BatchNumberProperty}-${item.InternalSerialNumber}-${item.ItemCode}-${item.OnHandQty}-${item.WhsCode}-${item.BinCode}`}
                        className="neo-tr"
                      >
                        <td>{/* {key+1} */}</td>
                        <td>{formatDate(item.InDate, "MMM D, YYYY")}</td>
                        <td>
                          {item.InternalSerialNumber
                            ? item.InternalSerialNumber
                            : item.BatchNumber
                              ? item.BatchNumber
                              : item.BatchNumberProperty
                                ? item.BatchNumberProperty
                                : ""}
                        </td>
                        <td>{item.ItemCode}</td>
                        {displayWHBinColumns && (
                          <>
                            <td>{item.WhsCode}</td>
                            <td>{item.BinCode}</td>
                          </>
                        )}
                        <td>{parseFloat(item.OnHandQty).toFixed(2)}</td>
                        <td>
                          {/* Need to set `isSelected` as `false` when an item is deleted from the parent comp.
                          Need work! So keeping this on-hold for now. 
                        {item.isSelected ?
                          <span className="text-success">Selected</span>
                          : */}
                          <PlusSquare
                            size={25}
                            className="text-primary"
                            onClick={() => handleBatchSerialsSelection(key, item, true)}
                          />
                          {/* } */}
                        </td>
                      </tr>
                    );
                  }
                })
              : null}
          </tbody>
        </Table>
      </div>
    </>
  );
};

export default BatchSerialsSelectionCard;
