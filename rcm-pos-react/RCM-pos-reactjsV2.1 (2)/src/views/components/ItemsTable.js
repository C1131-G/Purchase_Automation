import React, { useState, useEffect } from "react";
import { Row, Col, Card, CardBody, Input, Table } from "reactstrap";
import cloneDeep from "lodash.clonedeep";
import { displayModes, itemTypes, statusColors } from "../../config/config";
import BatchSerialRows from "./BatchSerialRows";
import ToastMessage from "../../components/ToastMessage";

const ItemsTable = (props) => {
  const [warningMsg, setWarningMsg] = useState("");
  const [itemsList, setItemsList] = useState(props.itemsList ? props.itemsList : []);

  let itemsTableHead = ["#", "Item Description", "Item No.", "From Warehouse", "Qty", "UOM"]; //"From Bin Loc.",

  //show Del. option only when there are more than 1 item
  if (props.operation === displayModes.CREATE && itemsList.length > 1) {
    itemsTableHead.splice(0, 0, "Del.");
    itemsTableHead.splice(6, 0, "Added Qty");
    itemsTableHead.splice(7, 0, "Remaining Qty");
  } else if (props.operation === displayModes.CREATE) {
    itemsTableHead.splice(5, 0, "Added Qty");
    itemsTableHead.splice(6, 0, "Remaining Qty");
  }

  useEffect(() => {
    // console.log("ItemsTable - useEffect: ", JSON.stringify(props.itemsList));
    setItemsList(props.itemsList);
  }, [props.itemsList]);

  /**
   * Removes selected item from the Transfer request
   * @param {Number} key  Index of the item in the array
   */
  const handleRemoveItem = (key) => {
    setWarningMsg("");
    let updatedItemsList = cloneDeep(itemsList);
    updatedItemsList.splice(key, 1);
    setItemsList(updatedItemsList);
    props.updateItemsList(updatedItemsList);
  };

  /**
   * Set the selected Warehouse to the row
   * @param {Number}  key            Index
   * @param {String}  warehouseCode  Selected Warehouse's Code
   */
  const handleRowLevelWarehouseChange = async (key, warehouseCode) => {
    setWarningMsg("");
    let updatedItemsList = cloneDeep(itemsList);
    updatedItemsList[key].WarehouseCode = warehouseCode;
    setItemsList(updatedItemsList);
    props.updateItemsList(updatedItemsList);
  };
  /**
   * Update Quantity and other values changed in the Items Table
   * @param {String} itemType   Batch or Serial
   * @param {String} value      New Qty
   * @param {Number} itemKey    Index of the current 'row' in the able
   * @param {Number} batchSerialKey Index of the current Batch or Serial under the current 'row'
   */
  const handleBatchSerialQtyChange = (itemType, value, itemKey, batchSerialKey) => {
    setWarningMsg("");
    let warningMsg = "Quantity cannot be greater than the available quantity in the Warehouse";
    if (value > -1) {
      let updatedItemsList = cloneDeep(itemsList);
      let diff;
      if (itemType === itemTypes.BATCHES) {
        if (
          value > parseFloat(updatedItemsList[itemKey].BatchNumbers[batchSerialKey].ScannedQuantity)
        ) {
          setWarningMsg(warningMsg);
        } else {
          //reduce the Added Qty based on the new Qty entered
          console.log(
            "updatedItemsList[itemKey].BatchNumbers[batchSerialKey].Quantity: " +
              updatedItemsList[itemKey].BatchNumbers[batchSerialKey].Quantity,
          );
          diff =
            parseFloat(updatedItemsList[itemKey].BatchNumbers[batchSerialKey].Quantity) - value;
          console.log("diff: " + diff);
          updatedItemsList[itemKey].AddedQuantity =
            parseFloat(updatedItemsList[itemKey].AddedQuantity) - diff;

          console.log(
            "updatedItemsList[itemKey].AddedQuantity: " + updatedItemsList[itemKey].AddedQuantity,
          );

          //set the new value to the Batch
          updatedItemsList[itemKey].BatchNumbers[batchSerialKey].Quantity = value;
        }
      } else if (itemType === itemTypes.SERIAL_NUMBERS) {
        if (
          value >
          parseFloat(updatedItemsList[itemKey].SerialNumbers[batchSerialKey].ScannedQuantity)
        ) {
          setWarningMsg(warningMsg);
        } else {
          //reduce the Added Qty based on the new Qty entered
          diff =
            parseFloat(updatedItemsList[itemKey].SerialNumbers[batchSerialKey].Quantity) - value;
          updatedItemsList[itemKey].AddedQuantity =
            parseFloat(updatedItemsList[itemKey].AddedQuantity) - diff;

          //set the new value to the Serial array
          updatedItemsList[itemKey].SerialNumbers[batchSerialKey].Quantity = value;
        }
      }
      setItemsList(updatedItemsList);
      props.updateItemsList(updatedItemsList);
    } else {
      setWarningMsg("Quantity cannot be less than 1");
    }
  };

  return (
    <>
      {/* Item Details */}
      <Row className="align-items-center">
        <Col xs="5">
          <h6 className="heading-small text-muted mb-4">Item Details</h6>
        </Col>
        {/* {props.operation === displayModes.CREATE &&
        <Col xs="7" className="mb-4 text-right">
          <Button
            size="sm"
            //className="ml-auto" //this will move the 'Save' button to the left side of the modal
            color="primary"
            type="button"
            //onClick={() => this.handleAddItem()}
            onClick={() => this.toggleModal("itemListPopup")}
          >
            Add or Remove Item
          </Button>
        </Col>
      } */}
      </Row>
      <Card className="mt--2 shadow-xl">
        {" "}
        {/**  */}
        <CardBody>
          {" "}
          {/** className="pl-lg--4" - DIDN'T Work: Added to reduce the left space b/w table n Card*/}
          <Table size="sm" className="align-items-center table-flush" responsive>
            {/** ml-lg--2 - DIDN'T Work: Added to reduce the left space b/w table n Card*/}
            <thead className="thead-light">
              <tr>
                {itemsTableHead.map((headerCol, key) => {
                  return (
                    //(key == 0) ? : //let the 1st Header column be aligned "left" & the rest use "center" alignment
                    <th scope="col" key={key}>
                      {headerCol}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Array.isArray(itemsList) && itemsList.length > 0
                ? itemsList.map((item, itemKey) => {
                    return (
                      <>
                        <tr key={item.ItemCode + item.Quantity} id={"trId" + itemKey}>
                          {/* Display del. icon only when there are more than 1 item in the table */}
                          {props.operation === displayModes.CREATE && itemsList.length > 1 && (
                            <td>
                              <span
                                id={"itemRemoval-" + itemKey}
                                className="btn-inner--icon mt-1 cursor-pointer"
                                onClick={() => handleRemoveItem(itemKey)}
                              >
                                <i className="fa fa-trash text-red" />
                              </span>
                            </td>
                          )}
                          <td>{itemKey + 1}</td>
                          <th scope="row" style={{ whiteSpace: "unset" }}>
                            {item.ItemName}
                          </th>
                          <td>{item.ItemCode}</td>
                          {/* <td>
                        {item.WarehouseCode ? props.getWarehouseName(item.WarehouseCode)
                          : "NA"}
                      </td> */}
                          <td style={{ whiteSpace: "unset" }}>
                            {props.operation === displayModes.CREATE ? (
                              <Input
                                bsSize="sm"
                                type="select"
                                name="select"
                                className={"form-control "} // + invalidRowFromWarehouse[itemKey]
                                value={item.WarehouseCode ? item.WarehouseCode : ""}
                                //style={{ width: "auto" }} //width: 100
                                onChange={(event) =>
                                  handleRowLevelWarehouseChange(itemKey, event.target.value)
                                }
                              >
                                <option value="">-- Select a Warehouse --</option>
                                {props.warehouseList.map((warehouse) => {
                                  return (
                                    <option key={warehouse.WhsCode} value={warehouse.WhsCode}>
                                      {`${warehouse.WhsCode} - ${warehouse.WhsName}`}
                                    </option>
                                  );
                                })}
                              </Input>
                            ) : (
                              props.getWarehouseName(item.WarehouseCode)
                            )}
                          </td>
                          <td>
                            {/* {parseFloat(item.Quantity).toFixed(2)} */}
                            {props.operation === displayModes.CREATE ? (
                              <Input
                                bsSize="sm"
                                style={{ width: 90 + "%" }}
                                value={item.Quantity}
                                className={"form-control"} // display-4 text-gray-dark
                                placeholder=""
                                type="number"
                                onChange={(e) =>
                                  props.handleQuantityChange(e.target.value, itemKey)
                                }
                              />
                            ) : (
                              parseFloat(item.Quantity).toFixed(2)
                            )}
                          </td>
                          {props.operation === displayModes.CREATE && (
                            <>
                              <td>
                                {!isNaN(item.AddedQuantity) ? parseFloat(item.AddedQuantity) : "0"}
                              </td>
                              <td>
                                {!isNaN(item.Quantity) && !isNaN(parseFloat(item.AddedQuantity))
                                  ? parseFloat(item.Quantity) - parseFloat(item.AddedQuantity)
                                  : isNaN(item.AddedQuantity)
                                    ? item.Quantity
                                    : "0"}
                              </td>
                            </>
                          )}
                          <td>{item.UomCode}</td>
                        </tr>
                        {/** Batch/Serial info */}
                        {Array.isArray(item.BatchNumbers) && item.BatchNumbers.length > 0 ? ( //item.ManBtchNum === "Y"
                          <BatchSerialRows
                            itemKey={itemKey}
                            itemType={itemTypes.BATCHES}
                            batchSerialNumbers={item.BatchNumbers}
                            handleDeleteBatchSerial={props.handleDeleteBatchSerial}
                            handleQuantityChange={handleBatchSerialQtyChange}
                            operation={props.operation}
                          />
                        ) : Array.isArray(item.SerialNumbers) && item.SerialNumbers.length > 0 ? ( //item.ManSerNum === "Y"
                          <BatchSerialRows
                            itemKey={itemKey}
                            itemType={itemTypes.SERIAL_NUMBERS}
                            batchSerialNumbers={item.SerialNumbers}
                            handleDeleteBatchSerial={props.handleDeleteBatchSerial}
                            handleQuantityChange={handleBatchSerialQtyChange}
                            operation={props.operation}
                          />
                        ) : null}
                      </>
                    );
                  })
                : null}
            </tbody>
          </Table>
        </CardBody>
      </Card>
      <ToastMessage type={statusColors.WARNING} message={warningMsg} />
    </>
  );
};

export default ItemsTable;
