import React from "react";
import classnames from "classnames";
// reactstrap components
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Form,
  FormGroup,
  Input,
  InputGroupAddon,
  InputGroupText,
  CustomInput,
  Label,
  Row,
  Col,
  Modal,
  CardFooter,
  Table,
  Spinner,
  InputGroup,
  Popover,
  PopoverBody,
} from "reactstrap";
import { X, PlusSquare } from "react-feather";
import { cloneDeep } from "lodash";
import QRCodeScanner from "../../components/QRCodeScanner";

import api from "../../config/api-nodejs";
import { scrollToElement, formatDate } from "../../config/util.js";
import {
  userRoles,
  draftStatus as draftStatusList,
  displayModes,
  portalModules,
  apiURIs,
} from "../../config/config.js";

export default class ScanAndSearchBatchSerialItems extends React.PureComponent {
  state = {
    batchSerialNo: "",
    oldBatchSerialItemsList: [],
    filteredOldBatchSerialItemsList: [],
    qrScannerPopover: false,
    oldBatchSerialItemsPopup: false,
    warningMsg: "",
    showMultiBatchSerialList: false,
    scannedBatchSerialItemsList: [],
    scannedBatchSerialNo: "",
  };

  toggleComponent = (name) => {
    // this.setState({ [name]: !this.state[name] });
    this.setState((state) => ({ [name]: !state[name] }));
  };

  toggleOldItemsModal = async () => {
    this.setState({
      successMsg: "",
      warningMsg: "",
    });

    if (this.state.oldBatchSerialItemsPopup) {
      //if the Modal is open clear the warnign msg and close it
      this.setState({ oldBatchSerialItemsPopup: false });
    } else {
      //if the modal is closed, open it and pull 'old' Batch/Serial nos. to display in it
      if (
        !Array.isArray(this.state.oldBatchSerialItemsList) ||
        !this.state.oldBatchSerialItemsList.length
      ) {
        await this.getBatchSerialInfo("", "ITEM_WITHOUT_QRCODE");
      }
      this.setState({ oldBatchSerialItemsPopup: true });
    }
  };

  /**
   * Sets the Batch or Serial NO. to the state. Need to add validation to check the number format
   * to block users from entering invalid numbers
   * @param {String} batchSerialNo
   */
  setBatchSerialNo = (batchSerialNo) => {
    if (batchSerialNo) {
      this.setState({
        warningMsg: "",
        batchSerialNo: batchSerialNo.trim(),
      });

      //Get the Batch/Serial data right away once the user scans the QR Code via QR Code scanner or copy paste
      //the code
      this.getBatchSerialInfo(batchSerialNo);
    } else {
      this.setState({ batchSerialNo: "", warningMsg: "" });
    }
  };

  /**
   * Closes the Batch/Serial modal & sends the selected BatchSerial rec. to teh parent comp.
   * @param {*} batchSerialRec
   */
  handleBatchSerialSelection = (batchSerialRec) => {
    this.setState({ showMultiBatchSerialList: false });
    this.props.addScannedBatchSerialItemToRow(batchSerialRec);
  };

  /**
   * Filters Items based on the 'searchKey' and returns the matching records.
   * @param {String} searchKey Item Code or Name
   */
  handleItemSearch = (searchKey) => {
    console.log(`StockTransferDetails - ${searchKey}`);
    const { oldBatchSerialItemsList } = this.state;
    let filteredOldBatchSerialItemsList = [];

    //if the searchKey is Not a Number, change it to Upper case to make the search 'case insensitive'
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
        filteredOldBatchSerialItemsList.push(item);
      }
    });
    //console.log(`filteredItemsList: ${JSON.stringify(filteredItemsList)}`);
    this.setState({ filteredOldBatchSerialItemsList });
  };

  /**
   * Parses and returns JSON string that is scanned via QR Code reader
   * @param {*} batchSerialNo
   */
  parseBatchSerialNumber = (batchSerialNo) => {
    /* If a QR Code is scanned via QRCode Reader
     * JSON string will be auto-entered in the Batch/Serial txt box
     * Parsing it to get the BNo or SNo props from the scanned text
     */
    try {
      if (typeof batchSerialNo !== "object") {
        return JSON.parse(batchSerialNo);
      } else {
        return batchSerialNo;
      }
    } catch (err) {
      return batchSerialNo;
    }
  };

  /**
   * TODO: Need to add this to items-helper.js and utilize it here
   *
   * Get the ItemCode, Quantity & Warehouse details from the user entered Batch or Serial No.
   * @param {String}  batchSerialNo Batch or Serial No. entered by the user or scanned from QR Code.
   * @param {String}  type          Type of the Item i.e., With or Without QR Code (ITEM_WITHOUT_QRCODE).
   *                                Old items that were added before POS implementation will not have
   *                                QR Codes sticked to them.
   *                                NOTE: 'type' arg will be passed only for OLD items, for New items
   *                                this will be blank
   */

  getBatchSerialInfo = async (batchSerialNo = "", type = "") => {
    // console.log("getBatchSerialInfo - batchSerialNo: "+JSON.stringify(batchSerialNo));
    let params, warningMsg, itemCode;
    this.setState({ warningMsg: "", successMsg: "" });
    /* for 'old' items that don't have QR Code, get all the items that match
     * all 'ItemCode-FromWarehouse' combination in the ST Req. table & display them in the 'old'
     * item popup. Let the user select the Batch/Serial no. they want
     * (instead of Scanning/Entering Batch or Sr. no.)
     */
    if (type === "ITEM_WITHOUT_QRCODE") {
      let itemAndWHCodes = [];
      this.props.itemsList.map((item) => {
        itemAndWHCodes.push({
          itemCode: item.ItemCode,
          //'FromWarehouse' is from STR Row table (when creating ST) & 'wareHouse' is from Prod. Order Row tab
          //when creating ISP
          //'WarehouseCode' added for Sale Order
          warehouseCode: item.FromWarehouse
            ? item.FromWarehouse
            : item.WarehouseCode
              ? item.WarehouseCode
              : item.WhsCode
                ? item.WhsCode
                : item.wareHouse,
        });
      });
      params = { itemAndWHCodes: itemAndWHCodes };
    }
    //for items that have QR Codes (created after POS implementation)
    else {
      /* If the user scans a code via in-built Cam, 'batchSerialNo' arg will have a valid value.
       * If a no. is manually entered this arg. will be empty in which case the value from the 'state'
       * is sent to the api
       */
      //If a QR Code scanner is used to scan teh code, the Textbox is populated with JSON value that
      //is stored in teh qr code, below
      if (!batchSerialNo && this.state.batchSerialNo) {
        //Scanned via QR Code Reader
        batchSerialNo = this.parseBatchSerialNumber(this.state.batchSerialNo);
      } else {
        //Scanned via Cam Scanner
        batchSerialNo = this.parseBatchSerialNumber(batchSerialNo);
      }

      if (typeof batchSerialNo === "object") {
        if (batchSerialNo.BNo) {
          batchSerialNo = batchSerialNo.BNo;
        } else if (batchSerialNo.Bno) {
          batchSerialNo = batchSerialNo.Bno;
        } else if (batchSerialNo.SNo) {
          batchSerialNo = batchSerialNo.SNo;
        } else if (batchSerialNo.ItemNo) {
          batchSerialNo = batchSerialNo.ItemNo;
        } else {
          // batchSerialNo = this.state.batchSerialNo;
        }

        //Added to filter Batch/Serial recs. where same Batch/Serial# (created b4 POS) is assigned to more than 1 ItemCode
        if (batchSerialNo.ItemCode) {
          itemCode = batchSerialNo.ItemCode;
        }
      }

      //if the Batch/Serial No. is not entered or scanned
      if (!batchSerialNo) {
        warningMsg = "Enter a valid Batch or Serial No.";
      }
      //Added for Inventory Counting, where BinCode is mandatory to perform Batch/Serial No. based Search
      else if (this.props.isBinCodeRequired && !this.props.binCode) {
        warningMsg = "Select a Bin to proceed!";
      }

      if (!warningMsg) {
        if (!params) {
          params = { batchSerialNo: batchSerialNo };
          this.setState({ batchSerialNo });
          if (this.props.binCode) {
            params.binCode = this.props.binCode;
          }
          if (itemCode) {
            params.itemCode = itemCode;
          }
        }
      } else {
        this.setState({ warningMsg });
        return;
      }
    }

    if (params) {
      console.log("getBatchSerialInfo - params:" + JSON.stringify(params));
      this.setState({ warningMsg: "", isLoading: true });
      try {
        const response = await api.get("custom/batch-serial-info", {
          params: params,
        });
        console.log("getBatchSerialInfo - type:" + type);
        // console.log("getBatchSerialInfo - response.data: "+ JSON.stringify(response.data));

        if (type === "ITEM_WITHOUT_QRCODE") {
          if (Array.isArray(response.data) && response.data.length) {
            this.setState({
              oldBatchSerialItemsList: response.data,
              filteredOldBatchSerialItemsList: response.data,
            });
          } else {
            this.setState({
              warningMsg:
                "No items found. Please scan a QR Code or enter a Batch/Serial No. to add",
            });
          }
        } else {
          if (Array.isArray(response.data) && response.data.length > 0) {
            this.setState({ batchSerialNo: "" });
            //If there is only one matching rec. foudn for the scanned Batch/Sr# return it to the Parent comp.
            if (response.data.length === 1) {
              this.props.addScannedBatchSerialItemToRow(response.data[0]);
            }
            //if more than recs. are returned show them all, let the user select one of them
            //NOTE: This is useful when same Batch/Sr# is assigned to more than one Item under same Bin
            else {
              this.setState({
                scannedBatchSerialItemsList: response.data,
                showMultiBatchSerialList: true,
                scannedBatchSerialNo: batchSerialNo,
              });
            }
          } else {
            this.setState({
              warningMsg: "Please scan/enter a valid Batch/Serial No.!",
            });
          }
        }
      } catch (err) {
        if (err.response) {
          this.setState({ warningMsg: err.response.data.message });
        } else {
          this.setState({ warningMsg: JSON.stringify(err) });
        }
      } finally {
        this.setState({ isLoading: false });
      }
    }
  };

  /**
   * Removes Batch or Serial under a particular Item
   * @param {String} itemType   Batch or Serial
   * @param {Number} itemKey    Index of the current 'row' in the able
   * @param {Number} batchSerialKey Index of the current Batch or Serial under the current 'row'
   */
  handleDeleteBatchSerial = (itemType, itemKey, batchSerialKey) => {
    this.setState({ warningMsg: "" });
    const { itemsList } = this.props;
    let filteredOldBatchSerialItemsList = cloneDeep(this.state.filteredOldBatchSerialItemsList);
    let oldBatchSerialItemsList = cloneDeep(this.state.oldBatchSerialItemsList);

    let deletedBatchNum, deletedSerialNum;

    if (itemType === "Batch") {
      console.log(
        "itemsList[itemKey].BatchNumbers[batchSerialKey].Quantity: " +
          itemsList[itemKey].BatchNumbers[batchSerialKey].Quantity,
      );
      deletedBatchNum = itemsList[itemKey].BatchNumbers[batchSerialKey].BatchNumberProperty;
    } else if (itemType === "Serial") {
      deletedSerialNum = itemsList[itemKey].SerialNumbers[batchSerialKey].InternalSerialNumber;
    }

    //Uncheck old item's checkbox against the deleted Batch/Serial no. in the 'old' items popup
    //if items are available in the popup
    if (Array.isArray(oldBatchSerialItemsList) && oldBatchSerialItemsList.length > 0) {
      oldBatchSerialItemsList.forEach((item) => {
        //check if BatchNumberProperty & InternalSerialNumber are NOT null
        if (
          (item.BatchNumberProperty &&
            deletedBatchNum &&
            item.BatchNumberProperty == deletedBatchNum) ||
          (item.InternalSerialNumber &&
            deletedSerialNum &&
            item.InternalSerialNumber == deletedSerialNum)
        ) {
          item.selected = false;
        }
      });
      this.setState({ oldBatchSerialItemsList });
    }
    if (
      Array.isArray(filteredOldBatchSerialItemsList) &&
      filteredOldBatchSerialItemsList.length > 0
    ) {
      filteredOldBatchSerialItemsList.forEach((item) => {
        if (
          (item.BatchNumberProperty &&
            deletedBatchNum &&
            item.BatchNumberProperty == deletedBatchNum) ||
          (item.InternalSerialNumber &&
            deletedSerialNum &&
            item.InternalSerialNumber == deletedSerialNum)
        ) {
          item.selected = false;
        }
      });
      this.setState({ filteredOldBatchSerialItemsList });
    }

    this.props.handleDeleteBatchSerial(itemType, itemKey, batchSerialKey);
  };

  /**
   * Update the 'selected' prop for oldBatchSerialItemsList and add teh selected item
   * to Transfer 'rows'
   *
   * @param {Number}  index         Position of the selected/unselected Item
   * @param {Object}  selectedItem  Current Item obj.
   * @param {Boolean} isSelected    if the Item is selected or unselected
   */
  handleOldItemCheckboxChange = async (index, selectedItem, isSelected) => {
    // this.setState({ isLoading: true });
    let oldBatchSerialItemsList = cloneDeep(this.state.oldBatchSerialItemsList);
    let filteredOldBatchSerialItemsList = cloneDeep(this.state.filteredOldBatchSerialItemsList);
    let newItem = {};

    if (isSelected) {
      //clone the selectedItem. This works but cloning this way adds the 'selected' prop to itemsList
      //array too which is not required
      //itemsList.push({ ...selectedItem, OnHandQty: 1 });

      //check this box only when teh below method returns 'true'
      //it will be 'false' if the selected item is not added to a 'row' for any reason
      if (this.props.addScannedBatchSerialItemToRow(selectedItem)) {
        filteredOldBatchSerialItemsList[index].selected = true;
      }

      //set the 'selected' prop for the 'oldBatchSerialItemsList' as well
      oldBatchSerialItemsList.forEach((item) => {
        //check if BatchNumberProperty & InternalSerialNumber are NOT null
        if (
          (item.BatchNumberProperty &&
            item.BatchNumberProperty == selectedItem.BatchNumberProperty) ||
          (item.InternalSerialNumber &&
            item.InternalSerialNumber == selectedItem.InternalSerialNumber)
        ) {
          item.selected = true;
        }
      });
      this.setState({ oldBatchSerialItemsList, filteredOldBatchSerialItemsList });
    } else {
      let position = -1;
      const { itemsList } = this.props;

      if (Array.isArray(itemsList) && itemsList.length) {
        //if(itemsList.length) {
        for (let i = 0; i < itemsList.length; i++) {
          //get the position of the unselected item in the 'itemsList' array to remove it
          if (Array.isArray(itemsList[i].BatchNumbers) && itemsList[i].BatchNumbers.length > 0) {
            for (let b = 0; b < itemsList[i].BatchNumbers.length; b++) {
              if (
                itemsList[i].BatchNumbers[b].BatchNumberProperty == selectedItem.BatchNumberProperty
              ) {
                position = b;
                break;
              }
            }
            if (position != -1) {
              //itemsList[i].BatchNumbers.splice(position, 1);
              this.handleDeleteBatchSerial("Batch", i, position);
              position = -1;
            }
          } else if (
            Array.isArray(itemsList[i].SerialNumbers) &&
            itemsList[i].SerialNumbers.length > 0
          ) {
            for (let s = 0; s < itemsList[i].SerialNumbers.length; s++) {
              if (
                itemsList[i].SerialNumbers[s].InternalSerialNumber ==
                selectedItem.InternalSerialNumber
              ) {
                position = s;
                break;
              }
            }
            if (position != -1) {
              // itemsList[i].SerialNumbers.splice(position, 1);
              this.handleDeleteBatchSerial("Serial", i, position);
              position = -1;
            }
          }
        }
        //this will be taken care in handleDeleteBatchSerial()
        // this.setState({ itemsList });
      }
    }

    //set the 'selected' prop for the 'oldBatchSerialItemsList' as well
    // oldBatchSerialItemsList.forEach(item => {
    //   //check if BatchNumberProperty & InternalSerialNumber are NOT null
    //   if((item.BatchNumberProperty && item.BatchNumberProperty == selectedItem.BatchNumberProperty)
    //     || (item.InternalSerialNumber && item.InternalSerialNumber == selectedItem.InternalSerialNumber)) {
    //     item.selected = isSelected;
    //   }
    // })

    // this.setState({ isLoading: false });
  };
  // componentDidMount () {
  //   console.log("batchSerialNo: "+ this.state.batchSerialNo);
  //   this.setState({ batchSerialNo: "" });
  // }

  render() {
    const { filteredOldBatchSerialItemsList } = this.state;

    const disableMessage =
      "Below options are DISABLED as no Batch/Serial items are present in this request!";
    const itemsTableHeadForPopup = [
      "",
      "In Date",
      "Batch/Serial#",
      "Item No.",
      "Warehouse",
      "Bin",
      "Qty",
    ];

    let displayMode = displayModes.DISABLED;
    if (
      this.props.userRole == userRoles.APPROVER &&
      this.state.requestStatus == draftStatusList.PENDING
    ) {
      displayMode = displayModes.NORMAL;
    }

    return (
      <>
        <div>
          {this.props.isAllAreNormalItems && (
            <div class="disabled-content">
              <span className="disabled-content-msg text-primary">
                <i className="fa fa-info-circle" /> &nbsp;
                {disableMessage}
              </span>
            </div>
          )}
          <small className="text-muted">Scan QR Code or Enter No.</small>
          <Popover
            placement="left"
            isOpen={this.state.qrScannerPopover}
            hideArrow={true}
            target="qrScannerPopoverBtn"
            style={{ width: "250px", height: "320px" }}
            toggle={() => this.toggleComponent("qrScannerPopover")}
          >
            <h4 className="ml-3 mt-2">QR Code Scanner</h4>
            <span
              className="text-primary"
              style={{ cursor: "pointer", position: "fixed", top: 7, right: 12 }}
              onClick={() => this.toggleComponent("qrScannerPopover")}
            >
              <i className="fa fa-times" />
            </span>
            <PopoverBody>
              <QRCodeScanner
                displayScanner={this.state.qrScannerPopover}
                getRecord={this.getBatchSerialInfo}
              />
            </PopoverBody>
          </Popover>
          <Row>
            <Col sm="4" md="3" className="text-left ml-0 mt-1">
              <span
                id="qrScannerPopoverBtn"
                className="icon icon-lg icon-shape cursor-pointer"
                // style={{cursor: "pointer"}}
                // onClick={this.openScanner} //NOT Required
              >
                {/* <i className="fas fa-qrcode text-dark" /> */}
                <img
                  style={{ height: "65px", width: "65px" }}
                  src={require("assets/img/qr-code.png")}
                  alt="QR Code"
                />
              </span>
            </Col>
            <Col sm="8" md="9">
              <FormGroup className="mt-1 mb-2">
                <Input
                  bsSize="sm"
                  value={this.state.batchSerialNo}
                  className={"form-control display-4 text-gray-dark " + this.state.invalidInput}
                  id="input-batch-serial-no"
                  placeholder="Enter Batch or Serial No."
                  onChange={(e) => this.setBatchSerialNo(e.target.value)}
                  disabled={
                    this.props.operation === displayModes.CREATE
                      ? false
                      : displayMode == displayModes.DISABLED
                        ? true
                        : false
                  }
                />
              </FormGroup>
              {/* <Button
              className="mb-2 mt-1"
              onClick={() => this.getBatchSerialInfo()}
              size="sm" color="primary" type="button"
            >
              Add Item
            </Button> */}
            </Col>
          </Row>
          {this.props.showOldItemsModal && (
            <Row className="ml-1">
              <small>
                <b
                  // style={{cursor: "pointer"}}
                  className="text-primary cursor-pointer"
                  onClick={this.toggleOldItemsModal}
                >
                  Click here
                </b>{" "}
                to add items that don't have QR Code
              </small>
            </Row>
          )}
          <Row className="ml-3 mt-2">
            {this.state.warningMsg && (
              <span className="text-warning mr-20 small">
                <i className="fa fa-exclamation-triangle" /> &nbsp;
                {this.state.warningMsg}
              </span>
            )}
          </Row>
        </div>

        <Modal
          //size="sm" //if this prop is not set then the Modal size will be 'medium'
          className="modal-dialog-centered"
          isOpen={this.state.showMultiBatchSerialList}
          toggle={() => this.toggleComponent("showMultiBatchSerialList")}
          backdrop={"static"}
          keyboard={true}
          //style={{height: 500+"px", overflow: "auto"}}
        >
          <div className="modal-header mb--3">
            <h4 className="mt-0">
              Batch/Serial# <span className="text-primary">{this.state.scannedBatchSerialNo}</span>
            </h4>
            <span className="mb-2">
              {this.state.popupWarningMsg && (
                <span className="text-warning mr-20 small">
                  <i className="fa fa-exclamation-triangle" /> &nbsp;
                  {this.state.popupWarningMsg}
                </span>
              )}
            </span>
            <span style={{ position: "absolute", top: 7, right: 12 }}>
              <X
                size={18}
                className="text-danger ml-2"
                style={{ cursor: "pointer" }}
                onClick={() => this.toggleComponent("showMultiBatchSerialList")}
              />
            </span>
          </div>
          <div className="modal-body mt--2">
            {/* <div style={{ maxHeight: "380px", overflowY: "auto" }}> */}
            <Table size="sm" className="ml--1 mt--2 mb-0 mr--2 table-sm">
              <thead style={{ backgroundColor: "#8e7ef324" }}>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Item Code</th>
                  <th scope="col">Bin</th>
                  {/* <th scope="col">Batch/Serial No.</th> */}
                  <th scope="col">Available Qty</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(this.state.scannedBatchSerialItemsList) &&
                  this.state.scannedBatchSerialItemsList.length > 0 &&
                  this.state.scannedBatchSerialItemsList.map((rec, key) => {
                    return (
                      <tr
                        key={rec.BinCode + key}
                        id={"trId" + key}
                        className="cursor-pointer"
                        onClick={() => this.handleBatchSerialSelection(rec)}
                        // onClick={() => this.props.addScannedBatchSerialItemToRow(rec)}
                      >
                        <td>{key + 1}</td>
                        <td className="text-primary">{rec.ItemCode}</td>
                        <td>{rec.BinCode}</td>
                        {/* <td className="text-primary">
                      { rec.BatchNumberProperty ? rec.BatchNumberProperty
                        : rec.InternalSerialNumber }
                    </td> */}
                        <td>{parseFloat(rec.OnHandQty).toFixed(3)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </Table>
            {/* </div> */}
          </div>
        </Modal>

        {/* /** To display Old Batch/Serial Items that were created before POS implementation
         * i.e., the items that dont have QR Code sticked */}
        <Modal
          size="xl" //if this prop is not set then the Modal size will be 'medium'
          className="modal-dialog-centered"
          isOpen={this.state.oldBatchSerialItemsPopup}
          toggle={() => this.toggleOldItemsModal()}
          backdrop={"true"} //true - clicking outside the Modal will close the Modal.
          //       Modal will have a gray transparent bg
          //false - Modal doesn't close when clicking outside, but the bg will be transparent
          //'static' - Modal doesn't close when clicking outside & it will have a gray bg too
          keyboard={true} //true - pressing Esc button in the Keyboard will close the Modal
        >
          <Card className="modal-header mt--2">
            <Row className="align-items-center mx--2 my--2">
              <Col md="4">
                <h3 className="text-left">Items List</h3> {/** className="mb-1 mt-0 mr-4 ml-3" */}
              </Col>
              <Col md="8">
                {/* <div className="text-right">
            <span className="mb-1"> * className="mb-2 mt-3 pb-1" */}
                <i className="fa fa-info-circle text-primary" /> &nbsp;
                <small>Select the items to add to the request</small>
                {/* </span>
          </div> */}
              </Col>
              <Col sm="2" className="text-right">
                <Button
                  color="primary"
                  style={{ zIndex: "1010", position: "fixed", top: "50px", right: "20px" }}
                  onClick={() => this.toggleOldItemsModal()}
                  size="sm"
                >
                  Done
                </Button>
              </Col>
            </Row>
            <Row>
              <Col md="10">
                {" "}
                {/** className="align-items-left" */}
                <FormGroup
                  className={classnames({
                    focused: this.state.searchAltFocused,
                  })}
                >
                  <InputGroup className="input-group mb-0 ml-0 mt-2" size="sm">
                    {/** NOTE: input-group-alternative */}
                    <InputGroupAddon addonType="prepend">
                      <InputGroupText>
                        <i className="ni ni-zoom-split-in" />
                      </InputGroupText>
                    </InputGroupAddon>
                    <Input
                      placeholder="Search"
                      type="text"
                      onFocus={(e) => this.setState({ searchAltFocused: true })}
                      onBlur={(e) => this.setState({ searchAltFocused: false })}
                      onKeyUp={(e) => this.handleItemSearch(e.target.value)}
                    />
                  </InputGroup>
                </FormGroup>
              </Col>
              {/* <Col md="6">
            <span className="mb-3">
              {this.state.oldItemsPopupWarningMsg ?
                <span className="text-warning mr-20 small">
                  <i className="fa fa-exclamation-triangle" /> &nbsp;
                  {this.state.oldItemsPopupWarningMsg}
                </span>
              : this.state.oldItemsPopupSuccessMsg ?
                  <span className="text-success mr-5 small">
                    <i className="fa fa-info-circle" /> &nbsp;
                    {this.state.oldItemsPopupSuccessMsg}
                  </span>
              : null
              }
            </span>
          </Col> */}
            </Row>
          </Card>
          <div className="modal-body">
            {/** Replaced 'Card' with 'div' to remove padding-left, padding-right styles for
             * 'td' & 'th' elements, bcoz from Chrome Dev console found below styles are applied to Tables
             * within "Cards", this increased the table width making the horizontal scrollbar
             * appear, so user had to scroll a little to view the last column in the tbale.
             *    .card .table .th, .card .table .td {
             *        padding-left: 1.5rem,
             *        padding-right: 1.5rem
             *     }
             */}
            <div className="mt--5 shadow table-fixed-head table-fixed-head-md">
              <Table size="sm" className="align-items-center table-flush" responsive>
                <thead className="thead-light">
                  <tr>
                    {itemsTableHeadForPopup.map((headerCol, key) => {
                      return headerCol === "Qty" ? (
                        // Set 25% width for 'Qty' column
                        <th scope="col" key={key} className="w-25">
                          {headerCol}
                        </th>
                      ) : (
                        <th scope="col" key={key}>
                          {headerCol}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(filteredOldBatchSerialItemsList) &&
                  filteredOldBatchSerialItemsList.length
                    ? filteredOldBatchSerialItemsList.map((item, key) => {
                        return (
                          <tr
                            key={`${item.BatchNumberProperty}-${item.InternalSerialNumber}-${item.ItemCode}-${item.OnHandQty}-${item.WhsCode}-${item.BinCode}`}
                            className="neo-tr"
                          >
                            {/* <td>
                        <CustomInput
                          inline
                          id={`item-${item.BatchNumberProperty}-${item.InternalSerialNumber}-${item.ItemCode}-${item.OnHandQty}-${item.WhsCode}-${item.BinCode}`}
                          type="checkbox"
                          label="" //{key+1}
                          className="text-gray-dark mt-0" //display-4
                          checked={item.selected ? true: false}
                          onChange={(e) => this.handleOldItemCheckboxChange(key, item, e.target.checked)}
                          //disabled={this.state.displayMode === constants.EDIT ? false : true}
                        />
                      </td> */}
                            <td>
                              <PlusSquare
                                size={17}
                                className="text-primary"
                                onClick={() => this.handleOldItemCheckboxChange(key, item, true)}
                              />
                            </td>
                            <td>{formatDate(item.InDate, "MMM D, YYYY")}</td>
                            <td>
                              {item.BatchNumberProperty
                                ? item.BatchNumberProperty
                                : item.InternalSerialNumber}
                            </td>
                            <td>{item.ItemCode}</td>
                            {/* <td style={{ whiteSpace: "unset" }}>{item.ItemName}</td> */}
                            <td>{item.WhsCode}</td>
                            <td>{item.BinCode}</td>
                            <td>{parseFloat(item.OnHandQty).toFixed(2)}</td>
                          </tr>
                        );
                      })
                    : null}
                </tbody>
              </Table>
            </div>
          </div>
        </Modal>
      </>
    );
  }
}
