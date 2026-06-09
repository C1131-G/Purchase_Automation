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

const BatchSerialsSelectionModal = ({
  openModalOnItemClick,
  itemsList,
  selectedItemCode,
  displayWHBinColumns = false,
  addScannedBatchSerialItemToRow,
}) => {
  const [oldBatchSerialItemsList, setOldBatchSerialItemsList] = useState([]);
  const [filteredOldBatchSerialItemsList, setFilteredOldBatchSerialItemsList] = useState([]);
  const [oldBatchSerialItemsPopup, setOldBatchSerialItemsPopup] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");

  const toggleOldItemsModal = async () => {
    setWarningMsg("");

    if (oldBatchSerialItemsPopup) {
      setOldBatchSerialItemsPopup(false);
    } else {
      await loadRecords();
      setOldBatchSerialItemsPopup(true);
    }
  };

  const loadRecords = async () => {
    try {
      if (!Array.isArray(oldBatchSerialItemsList) || !oldBatchSerialItemsList.length) {
        const response = await getBatchSerialInfo(itemsList, itemRequestType.ITEM_WITHOUT_QRCODE);
        if (response) {
          setOldBatchSerialItemsList(response);
          setFilteredOldBatchSerialItemsList(response);
        } else {
          setWarningMsg("No items found. Please scan a QR Code or enter a Batch/Serial No. to add");
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
      if (addScannedBatchSerialItemToRow(selectedItem)) {
        // Need to set `isSelected` as `false` when an item is deleted from the parent comp.
        // Need work! So keeping this on-hold for now. At this point, below two code block is NOT Required at all.
        setFilteredOldBatchSerialItemsList((prevList) =>
          prevList.map((item, i) => (i === index ? { ...item, isSelected: true } : item)),
        );

        setOldBatchSerialItemsList((prevList) =>
          prevList.map((item) =>
            (item.BatchNumber && item.BatchNumber === selectedItem.BatchNumber) ||
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
    if (openModalOnItemClick && !oldBatchSerialItemsPopup && selectedItemCode && itemsList.length) {
      loadRecords();
      setOldBatchSerialItemsPopup(true);
    }
  }, [openModalOnItemClick, selectedItemCode, itemsList]);

  const itemsTableHeadForPopup = ["#", "In Date", "Batch/Serial#", "Item No.", "Qty", "Select"];

  if (displayWHBinColumns) {
    itemsTableHeadForPopup.splice(4, 0, "Warehouse", "Bin");
  }

  const batchSerialItemsList = filteredOldBatchSerialItemsList.filter(
    (item) => item.ItemCode === selectedItemCode,
  );
  return (
    <>
      <div>
        {!openModalOnItemClick && (
          <Row className="ml-1">
            <small>
              <b className="text-primary cursor-pointer" onClick={toggleOldItemsModal}>
                Click here
              </b>{" "}
              to add Batch, Serial Nos.
            </small>
          </Row>
        )}
        <Row className="ml-3 mt-2">
          {warningMsg && (
            <span className="text-warning mr-20 small">
              <i className="fa fa-exclamation-triangle" /> &nbsp;
              {warningMsg}
            </span>
          )}
        </Row>
      </div>

      <Modal
        size="lg"
        className="modal-dialog-centered"
        isOpen={oldBatchSerialItemsPopup}
        toggle={toggleOldItemsModal}
        backdrop={"true"}
        keyboard={true}
      >
        <Card className="modal-header mt--2">
          <Row className="mx--2 my--2">
            {/* <Col md="3">
              <h3 className="text-left">Items</h3>
            </Col> */}
            <Col md="12">
              <i className="fa fa-info-circle text-primary" /> &nbsp;
              <small className="font-weight-600">Select the required Batch, Serials Nos.</small>
            </Col>
            <Col sm="2" className="text-right mt-2">
              <Button
                color="primary"
                style={{ zIndex: "1010", position: "fixed", top: "50px", right: "20px" }}
                onClick={toggleOldItemsModal}
                size="sm"
              >
                Done
              </Button>
            </Col>
          </Row>
          <Row>
            <Col md="12">
              <FormGroup className={classnames({ focused: warningMsg })}>
                <InputGroup className="input-group mb--2 ml-0 mt-2" size="sm">
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
        <div className="modal-body">
          <div className="mt--5 shadow table-fixed-head table-fixed-head-md">
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
                {Array.isArray(batchSerialItemsList) && batchSerialItemsList.length
                  ? batchSerialItemsList.map((item, key) => (
                      // item.ItemCode === selectedItemCode &&
                      <tr
                        key={`${item.BatchNumberProperty}-${item.InternalSerialNumber}-${item.ItemCode}-${item.OnHandQty}-${item.WhsCode}-${item.BinCode}`}
                        className="neo-tr"
                      >
                        <td>{key + 1}</td>
                        <td>{formatDate(item.InDate, "MMM D, YYYY")}</td>
                        <td>
                          {item.BatchNumberProperty
                            ? item.BatchNumberProperty
                            : item.InternalSerialNumber}
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
                    ))
                  : null}
              </tbody>
            </Table>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BatchSerialsSelectionModal;
