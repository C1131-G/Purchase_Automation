import React from "react";
import classnames from "classnames";
import PropTypes from "prop-types";
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
import { Tooltip } from "reactstrap";
import QRCode from "qrcode.react";
import AutoComplete from "../../components/AutoComplete";

import api from "../../config/api-nodejs";
//for Mock API
import axios from "axios";
import { scrollToElement, formatDate, showWarningMsg } from "../../config/util.js";
import {
  userRoles,
  draftStatus as draftStatusList,
  displayModes,
  apiURIs,
  portalModules,
} from "../../config/config.js";
// import "../../assets/css/custom-style.css";
// import "./popover.scss";

const today = new Date();

class RequestDetails extends React.Component {
  _isMounted = false;
  state = {
    error: "",
    warningMsg: "",
    operation: this.props.operation,
    requestDate: formatDate(today, "MMM D, YYYY"),
    warehouseList: [],
    fromWarehouse: "",
    toWarehouse: "",
    allItemsList: [],
    filteredItemsList: [],
    itemsListForTransfer: [],
    clearSelectedItem: false, //props for <AutoComplete> to remove Item
    itemListPopup: this.props.operation === "Create" ? true : false, //Display itemList only when the operation is "CREATE"
    invalidRowFromWarehouse: [],
    invalidInput: {},
    availableQuantityPopOver: [],
    fromWarehousePopover: false,
    tempFromWarehouse: "",

    rejectReasonPopup: false,
    qrCodesPopup: false,
    rejectReason: "",
    popupWarningMsg: "",
    selectedRecord: {},
    actualDraftStatus: "",
    internalKey: "",
    requestDocEntry: "",
    originatorId: "",
    docDate: "",
    comments: "",
  };

  toggleModal = (name) => {
    console.log("toggleModal");
    /**
     * Added cond. to check Component "mounted" status to fix below warning 
     *    Warning: Can't perform a React state update on an unmounted component.
     *    This is a no-op, but it indicates a memory leak in your application.
     *    To fix, cancel all subscriptions and asynchronous tasks in the componentWillUnmount method.
    in RequestDetails (at GRPODraftDetails.js:62)
    in Suspense (at GRPODraftDetails.js:61)
    */
    //replace filtered Items with All Items list when closing the Items List popup
    if (name === "itemListPopup" && this.state[name]) {
      console.log("itemListPopup");
      this.setState({ filteredItemsList: [...this.state.allItemsList] });
    }
    if (this._isMounted) {
      this.setState({
        [name]: !this.state[name],
      });
    }
  };

  togglePopover = (name) => {
    this.setState({ [name]: !this.state[name] });
  };

  toggleAvailableQuantityPopOver = (key) => {
    //isOpen
    console.log("toggleAvailableQuantityPopOver - key: " + key);
    let availableQuantityPopOver = [...this.state.availableQuantityPopOver];
    availableQuantityPopOver[key] = availableQuantityPopOver[key] ? false : true;

    // let availableQuantityPopOver = [];
    // availableQuantityPopOver[key] = isOpen;

    console.log("availableQuantityPopOver: " + JSON.stringify(availableQuantityPopOver));
    this.setState({
      availableQuantityPopOver,
    });
  };

  openAvailableQuantityPopOver = (key) => {
    console.log("openAvailableQuantityPopOver - key: " + key);
    let availableQuantityPopOver = [...this.state.availableQuantityPopOver];
    availableQuantityPopOver[key] = true;
    console.log("availableQuantityPopOver: " + JSON.stringify(availableQuantityPopOver));
    this.setState({
      availableQuantityPopOver,
    });
  };

  closeAvailableQuantityPopOver = (key) => {
    console.log("closeAvailableQuantityPopOver - key: " + key);
    let availableQuantityPopOver = [...this.state.availableQuantityPopOver];
    availableQuantityPopOver[key] = false;
    console.log("availableQuantityPopOver: " + JSON.stringify(availableQuantityPopOver));
    this.setState({
      availableQuantityPopOver,
    });
  };

  /**
   * Update Quantity and other values changed in the Items Table
   * @param {String} fieldName  Column Name
   * @param {String} value      Selected value
   * @param {Number} key        Index
   */
  handleFieldChange = (fieldName, value, key) => {
    this.setState({ warningMsg: "" });
    if ((fieldName === "Quantity") & (value > 0)) {
      let itemsListForTransfer = [...this.state.itemsListForTransfer];

      if (value > parseInt(itemsListForTransfer[key].availableQuantity)) {
        this.setState({
          warningMsg: "Quantity cannot be greater than the available quantity in the Warehouse",
        });
      } else {
        itemsListForTransfer[key][fieldName] = value;
        this.setState({ itemsListForTransfer });
      }
    }
  };

  /**
   * Removes selected item from the Transfer request
   * @param {Number} key  Index of the item in the array
   */
  handleRemoveItem = (key) => {
    this.setState({ warningMsg: "" });
    let itemsListForTransfer = [...this.state.itemsListForTransfer];
    const removedItemCode = itemsListForTransfer[key].ItemCode;
    itemsListForTransfer.splice(key, 1);

    let allItemsList = [...this.state.allItemsList];
    allItemsList.forEach((item) => {
      if (item.ItemCode === removedItemCode) {
        item.selected = false;
      }
    });
    //filteredItemsList //NOTE: No need to set 'selecte' false in this list, updating allItemsList will do

    this.setState({ itemsListForTransfer, allItemsList });
  };

  /**
   * Make a copy of the current item and adds it to the Transfer Req.
   * @param {Object} selectedItem
   * @param {Number} key
   */
  handleCopyItem = (selectedItem, key) => {
    let itemsListForTransfer = [...this.state.itemsListForTransfer];
    let copiedItem = {
      ItemCode: selectedItem.ItemCode,
      ItemName: selectedItem.ItemName,
      Quantity: 0,
      InvntryUom: selectedItem.InvntryUom,
      FromWarehouse: "",
    };
    itemsListForTransfer.splice(key + 1, 0, copiedItem);
    this.setState({ itemsListForTransfer });
  };

  handleAddItem = () => {
    const length = this.state.itemsListForTransfer.length;
    const itemsListForTransfer = this.state.itemsListForTransfer.slice();
    let nextLineNum = 0;
    if (length > 0) {
      //current length will be the next index in the array
      nextLineNum = length;
    }
    itemsListForTransfer.push({
      LineNum: nextLineNum,
      ItemCode: "",
      Quantity: "",
      //UOM: ""
    });
    this.setState({ itemsListForTransfer });
  };

  /**
   * Gets all Items for the selected STR
   */
  getItemsList = async (docEntry, moduleName) => {
    let uri;
    //select the URI based on the moduleName selected in teh Filters portlet
    if (moduleName === portalModules.GRPO) {
      //if the selected record is a GRPO pass the "type" as "grpo-rows"
      if (this.props.selectedRecord.U_DraftStatus === draftStatusList.AUTO_APPROVED) {
        uri = `/service/grpo-draft/grpo-rows`;
      }
      //if the selected record is a GRPO Draft pass the "type" as "grpo-draft-rows"
      else {
        uri = `/service/grpo-draft/grpo-draft-rows`;
      }
    } else if (
      [
        portalModules.STOCK_TRANSFER_REQUEST,
        portalModules.STOCK_TRANSFER,
        portalModules.ISSUE_FOR_PRODUCTION,
        portalModules.RECEIPT_FROM_PRODUCTION,
      ].includes(moduleName)
    ) {
      //For direct STRs
      if (this.props.selectedRecord.U_DraftStatus === draftStatusList.AUTO_APPROVED) {
        uri = `/custom/${apiURIs[moduleName]}/rows/direct`;
      }
      //For STRs Drafts
      else {
        uri = `/custom/${apiURIs[moduleName]}/rows/draft`;
      }
    } else {
      uri = `/custom/${apiURIs[moduleName]}/rows`;
    }
    console.log("RequestDetails - getItemsList() - uri: " + uri);
    if (!this.state.itemsListForTransfer.length) {
      this.setState({ isLoading: true });
      try {
        let itemsListForTransfer = [];
        //pass the "type" as "rows" & Drafts's DocEntry to grpo-drafts API to pull the Item Rows
        const response = await api.get(`${uri}/${docEntry}`, {
          params: { userId: localStorage.getItem("InternalKey") },
        });

        if (moduleName === portalModules.GRPO) {
          itemsListForTransfer = response.data.draft.DocumentLines;
        } else {
          itemsListForTransfer = response.data.rows;
        }
        console.log(`RequestDetails - getItemsList List: ${JSON.stringify(itemsListForTransfer)}`);
        if (response.data && Array.isArray(itemsListForTransfer) && itemsListForTransfer.length) {
          this.setState({
            itemsListForTransfer,
          });
        }
      } catch (error) {
        console.log("error:" + JSON.stringify(error.response));
        this.setState({ warningMsg: error.response.data.message });
      } finally {
        this.setState({ isLoading: false });
      }
    }
  };

  handleCheckboxChange = (name) => (event) => {
    const value = event.target.checked;
    this.setState({ [name]: value ? "Y" : "N" });
  };

  /**
   * Clears selected Item Desc. in the auto-complete textbox, clears current Item info from "state"
   * and calls getCallDetails()
   * This funct. is invoked when clearing Item Desc. using "X"
   */
  resetClearInput = (key) => {
    this.setState({
      clearSelectedItem: false,
      customerId: null,
      custShortName: null,
    });
  };

  /**
   * Called from AutoComplete component.
   * Sets "customerId" as NULL when a value is removed from AutoComplete box
   * @param {Event} event parameter passed from AutoComplete comp.
   */
  handleItemReset = (event) => {
    console.log("event.target.value: " + event.target.value);
    if (event.target.value === "") {
      this.setState({ customerId: null });
    }
  };

  /** Callback function executed from child component <AutoComplete>.
   * @param {Stringt} itemDescription customer selected in the AutoComplete textbox
   */
  handleItemChange = (itemDescription) => {
    console.log("handleItemChange: " + itemDescription);
    let selectedItem = this.state.allItemsList.filter((customer) => {
      return customer.customerName === itemDescription; //event.currentTarget.innerText
    });
    console.log("selectedItem: " + JSON.stringify(selectedItem[0].shortName));
    this.setState({
      customerId: selectedItem[0].customerId,
      custShortName: selectedItem[0].shortName,
    });
  };

  /**
   * Returns Warehouse Name for the given Code
   * @param {String} warehouseCode
   */
  getWarehouseName = (warehouseCode) => {
    const { warehouseList } = this.state;
    let warehouseName = "NA";
    if (Array.isArray(warehouseList) && warehouseList.length) {
      for (let i = 0; i < warehouseList.length; i++) {
        if (warehouseList[i].WhsCode === warehouseCode) {
          warehouseName = `${warehouseList[i].WhsCode} - ${warehouseList[i].WhsName}`;
          break;
        }
      }
    }
    return warehouseName;
  };

  /**
   * Set the selected Warehouse to the current Item and get the Available Qty for the item in the Warehouse
   * @param {Number}  key            Index
   * @param {Object}  selectedItem
   * @param {String}  warehouseCode  Selected Warehouse's Code
   * @param {Boolean} togglePopover  Close the Available Qty Popover after WH change?
   */
  handleRowLevelWarehouseChange = async (
    key,
    selectedItem,
    warehouseCode,
    togglePopover = false,
  ) => {
    this.setState({ warningMsg: "" });
    let availableQuantity = "";
    let itemsListForTransfer = [...this.state.itemsListForTransfer];
    itemsListForTransfer[key].FromWarehouse = warehouseCode;

    //Close the 'Available Qty' popover if the WH change is initiated from the popover
    if (togglePopover) {
      this.toggleAvailableQuantityPopOver(key);
    }

    if (warehouseCode) {
      //Get Available Quantity of the current Item in the selected Warehouse

      /** Getting teh Availble Qty from already available 'allWarehouseAvailableQtyList' from the selected Item
      * instead of pulling it from API. So commented this out
      * 
      const response = await api.get("custom/item-qty-in-warehouse",
        {params: { itemCode: itemsListForTransfer[key].ItemCode, warehouseCode }});

      console.log("handleRowLevelWarehouseChange - response: "+ JSON.stringify(response));
      if(Array.isArray(response.data) && response.data.length) {
        availableQuantity = response.data[0].OnHand;
      }*/

      console.log(
        "selectedItem.allWarehouseAvailableQtyList: " +
          JSON.stringify(selectedItem.allWarehouseAvailableQtyList),
      );
      if (
        Array.isArray(selectedItem.allWarehouseAvailableQtyList) &&
        selectedItem.allWarehouseAvailableQtyList.length
      ) {
        for (let i = 0; i < selectedItem.allWarehouseAvailableQtyList.length; i++) {
          if (warehouseCode == selectedItem.allWarehouseAvailableQtyList[i].WhsCode) {
            availableQuantity = selectedItem.allWarehouseAvailableQtyList[i].OnHand;
            break;
          }
        }
      }
    }

    itemsListForTransfer[key].availableQuantity = availableQuantity;
    this.setState({ itemsListForTransfer });
  };

  /**
   * Sets the selected Warehouse Code to state var.
   * @param {String} stateVariable  fromWarehouse or toWarehouse
   * @param {String} warehouseCode       selected Warehouse Code
   * @param {Boolean} isConfirmed   bool. to check if user has confirmed that changing Warehouse will affect all
   *                                the Row level items' From Warehouses too
   */
  handleWarehouseChange = async (stateVariable, warehouseCode, isConfirmed = false) => {
    // let invalidInput = {...this.state.invalidInput};
    // invalidInput[stateVariable] = "";

    //Update FromWarehouse for ALL the 'Rows' when 'Header' level FromWH is changed
    if (
      stateVariable === "fromWarehouse" &&
      Array.isArray(this.state.itemsListForTransfer) &&
      this.state.itemsListForTransfer.length
    ) {
      //Check if the user has confirmed that changing the From Warehouse will affect all the Row level items'
      //From Warehouses too. If not confirmed set the selected WH to a temp var. and show the popover
      if (!isConfirmed) {
        this.setState({ tempFromWarehouse: warehouseCode, fromWarehousePopover: true });
      } else {
        this.setState({ isLoading: true, fromWarehousePopover: false });

        let itemsListForTransfer = [...this.state.itemsListForTransfer];
        if (warehouseCode) {
          /** Replacing this code block with below */
          // //Get Available Quantity for all the Items in the selected Warehouse
          // const response = await api.get("custom/item-qty-in-warehouse",
          //   { params: { warehouseCode } });

          // console.log("handleRowLevelWarehouseChange - response: "+ JSON.stringify(response));
          // if(Array.isArray(response.data) && response.data.length) {
          //   //set the selected WH & its Available Quantity for all rows
          //   itemsListForTransfer.forEach(item => {
          //     for(let i=0; response.data.length; i++) {
          //       if(item.ItemCode === response.data[i].ItemCode) {
          //         item.availableQuantity = response.data[i].OnHand;
          //         break;
          //       }
          //     }
          //     item.FromWarehouse = warehouseCode;
          //   });
          // }
          // else {
          //   itemsListForTransfer.forEach(item => {
          //     item.FromWarehouse = warehouseCode;
          //     item.availableQuantity = "";
          //   })
          // }

          //set the selected WH & its Available Quantity for all rows
          itemsListForTransfer.forEach((item) => {
            item.FromWarehouse = warehouseCode;
            if (
              Array.isArray(item.allWarehouseAvailableQtyList) &&
              item.allWarehouseAvailableQtyList.length
            ) {
              for (let i = 0; i < item.allWarehouseAvailableQtyList.length; i++) {
                if (warehouseCode == item.allWarehouseAvailableQtyList[i].WhsCode) {
                  item.availableQuantity = item.allWarehouseAvailableQtyList[i].OnHand;
                  break;
                }
              }
            }
          });
        }
        //if the selected WH Code is blank- reset all the Row level WHs & Available Qtys
        else {
          itemsListForTransfer.forEach((item) => {
            item.FromWarehouse = warehouseCode;
            item.availableQuantity = "";
          });
        }
        this.setState({
          isLoading: false,
          [stateVariable]: warehouseCode,
          itemsListForTransfer,
          invalidInput: {},
          warningMsg: "",
        });
      }
    } else {
      this.setState({
        [stateVariable]: warehouseCode,
        invalidInput: {},
        warningMsg: "",
      });
    }
  };

  /**
   * TODO: Need to move this method to helper.js and use it from other comps. too
   * (eg: to load Warehouse list in GRPODraft/ItemDetails.js)
   * Gets the list of Item Code & Desc from Item Master table and load the ITem dropdown list
   * @param {String} type "item"
   */
  loadDropdownList = async (type) => {
    this.setState({ isLoading: true });
    let stateVariable = "",
      response;
    if (type === "item") {
      stateVariable = "allItemsList";
    } else if (type === "warehouse") {
      stateVariable = "warehouseList";
    }
    try {
      response = await api.get("custom/" + type);
      response = response.data;
      console.log(`Item List: ${JSON.stringify(response)}`);
      if (Array.isArray(response) && response.length) {
        this.setState({ [stateVariable]: response });

        if (type === "item") {
          this.setState({ filteredItemsList: response });
        }
      }
    } catch (error) {
      this.setState({ warningMsg: error });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  /** Closes the popup and clears certain data from "state" variables when Cancel button is clicked */
  closePopup = () => {
    this.toggleModal("rejectReasonPopup");
    this.setState({
      warningMsg: "",
      popupWarningMsg: "",
      invalidInput: {},
    });
    //Reset "state" variables in the Parent Component when the popup is closed
    //this.props.setRecordDetails("Cancel", {}, 2);
  };

  /** Set the GRPODraft details from "props" to "state" and open the pop-up window
   */
  openTab = async () => {
    console.log("this.props.selectedRecord: " + JSON.stringify(this.props.selectedRecord));
    // const requestDocEntry = this.props.selectedRecord.DocEntry;
    const requestDocEntry = this.props.selectedRecord.ActualDocEntry
      ? this.props.selectedRecord.ActualDocEntry
      : this.props.selectedRecord.DocEntry;

    // console.log(`RequestDetails- moduleName: ${this.props.moduleName}`);
    if (["Edit", "View"].includes(this.props.operation)) {
      console.log(
        `RequestDetails- selectedRecord.itemList: ${JSON.stringify(this.props.selectedRecord.itemList)}`,
      );
      this.setState(
        {
          selectedRecord: this.props.selectedRecord,
          requestDocEntry,
          requestStatus: this.props.selectedRecord.U_DraftStatus,
          fromWarehouse: this.props.selectedRecord.FromWarehouse,
          toWarehouse: this.props.selectedRecord.ToWhsCode,
          rejectReason:
            this.props.selectedRecord.U_DraftStatus === draftStatusList.REJECTED &&
            !this.props.selectedRecord.U_RejectedReason
              ? "NA"
              : this.props.selectedRecord.U_RejectedReason,
          docDate: this.props.selectedRecord.DocDate,
          comments: this.props.selectedRecord.Comments,
          originatorId: this.props.selectedRecord.U_OriginatorId,
          multiLevelApproval: this.props.selectedRecord.U_MultiLevelApproval,
          approvalStatusId: this.props.selectedRecord.U_ApprovalStatusId,
          approvalLevel: this.props.selectedRecord.U_ApprovalLevel,
          //getting 'Rows' via a diff. api call (from getItemsList) instead of getting from below prop.
          // itemsListForTransfer: this.props.selectedRecord.itemList
        },
        await this.getItemsList(requestDocEntry, this.props.moduleName),
      );
    }
  };

  async componentDidUpdate(prevProps, prevState) {
    //console.log("prevProp: "+ JSON.stringify(prevProps.operation))
    console.log("componentDidUpdate operation: " + this.state.operation);
    //console.log("prevState: "+ JSON.stringify(prevState.selectedRecord))
    if (this.props.selectedRecord !== null && prevProps.selectedRecord === null) {
      //await this.getItemsList();
      await this.openTab();
    }
    console.log(
      "RequestDetails - componentDidUpdate - this.props.userRole: " + this.props.userRole,
    );
  }

  /**
   * Update the 'selected' prop for filteredItemsList & allItemsList and add teh selected item to
   * 'itemsListForTransfer'
   *
   * @param {Number}  index         Position of the selected/unselected Item
   * @param {Object}  selectedItem  Current Item obj.
   * @param {Boolean} isSelected    if the Item is selected or unselected
   */
  handleItemCheckboxChange = async (index, selectedItem, isSelected) => {
    this.setState({ isLoading: true });
    let allItemsList = this.state.allItemsList.slice();
    let filteredItemsList = this.state.filteredItemsList.slice();
    let newItem = {};
    let itemsListForTransfer = [];

    if (Array.isArray(this.state.itemsListForTransfer) && this.state.itemsListForTransfer.length)
      itemsListForTransfer = this.state.itemsListForTransfer.slice();

    //filteredItemsList[index].selected = isSelected;
    if (isSelected) {
      filteredItemsList[index].selected = true;
      //clone the selectedItem. This works but cloning this way adds the 'selected' prop to itemsListForTransfer
      //array too which is not required
      //itemsListForTransfer.push({ ...selectedItem, Quantity: 1 });
      newItem = {
        ItemCode: selectedItem.ItemCode,
        ItemName: selectedItem.ItemName,
        Quantity: 1,
        InvntryUom: selectedItem.InvntryUom,
        //FromWarehouse: this.state.fromWarehouse //TODO: Need to set availableQuantity for this row as well
      };
      try {
        const allWHItemQtyresponse = await api.get("custom/item-qty-in-warehouse", {
          params: { itemCode: selectedItem.ItemCode },
        });
        console.log("allWHItemQtyresponse: " + JSON.stringify(allWHItemQtyresponse));

        if (Array.isArray(allWHItemQtyresponse.data) && allWHItemQtyresponse.data.length) {
          newItem.allWarehouseAvailableQtyList = allWHItemQtyresponse.data;
        }
        itemsListForTransfer.push(newItem);
      } catch (err) {
        this.setState({
          warningMsg:
            err.data && err.data.message
              ? err.data.message
              : "Unable to get Item details! Please try again.",
        });
      }
    } else {
      let position;
      filteredItemsList[index].selected = false;
      if (itemsListForTransfer.length) {
        for (let i = 0; i < itemsListForTransfer.length; i++) {
          //get the position of the unselected item in the 'itemsListForTransfer' array to remove it
          if (itemsListForTransfer[i].ItemCode == selectedItem.ItemCode) {
            position = i;
            break;
          }
        }
        itemsListForTransfer.splice(position, 1);
      }
    }

    //set the 'selected' prop for the 'allItemsList' as well
    allItemsList.forEach((item) => {
      if (item.ItemCode === selectedItem.ItemCode) {
        item.selected = isSelected;
      }
    });

    this.setState({ allItemsList, filteredItemsList, itemsListForTransfer, isLoading: false });
  };

  /**
   * Filters Items based on the 'searchKey' and returns the matching records.
   * @param {String} searchKey Item Code or Name
   */
  handleItemSearch = (searchKey) => {
    console.log(`RequestDetails - ${searchKey}`);
    const { allItemsList } = this.state;
    let filteredItemsList = [];

    //if the searchKey is Not a Number, change it to Upper case to make the search 'case insensitive'
    if (isNaN(searchKey)) {
      searchKey = searchKey.toUpperCase();
    }

    allItemsList.forEach((item) => {
      if (
        item.ItemCode.toString().indexOf(searchKey) > -1 ||
        item.ItemName.toUpperCase().indexOf(searchKey) > -1
      ) {
        filteredItemsList.push(item);
      }
    });
    //console.log(`filteredItemsList: ${JSON.stringify(filteredItemsList)}`);
    this.setState({ filteredItemsList });
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  async componentDidMount() {
    console.log("RequestDetails - componentDidMount");
    this._isMounted = true;
    if (this.props.selectedRecord !== null) {
      await this.openTab();
    }
    console.log("RequestDetails - componentDidMount - this.props.userRole: " + this.props.userRole);
    console.log(
      "RequestDetails - componentDidMount - this.props.operation: " + this.props.operation,
    );

    if (this.state.operation === "Create") {
      //the below two List are required only durin "Create" op.
      if (!Array.isArray(this.state.filteredItemsList) || !this.state.filteredItemsList.length) {
        await this.loadDropdownList("item");
      }
      if (!Array.isArray(this.state.warehouseList) || !this.state.warehouseList.length) {
        await this.loadDropdownList("warehouse");
      }
    }
  }

  render() {
    console.log("filteredItemsList: " + JSON.stringify(this.state.filteredItemsList));
    const { operation, filteredItemsList } = this.state;
    let itemsTableHead = [
      "#",
      "Item Description",
      "Item Number",
      "From Warehouse",
      "Quantity",
      "UOM",
    ];

    if (operation === "Create") {
      itemsTableHead.splice(0, 0, "Del./Copy"); //Show Delete/Copy buttons
      itemsTableHead.splice(5, 0, "Available Qty"); //show this column only for "Create" op.
    }
    const itemsTableHeadForPopup = ["", "Item Number", "Item Description", "UOM"];

    let displayMode = displayModes.VIEW;
    if (
      this.props.userRole == userRoles.APPROVER &&
      this.state.requestStatus == draftStatusList.PENDING
    ) {
      displayMode = displayModes.EDIT;
    }
    console.log("this.state.requestStatus: " + this.state.requestStatus);
    console.log("displayMode: " + displayMode);
    return (
      <>
        <Row>
          <Col className="order-xl-1" xl="12">
            <Card className="bg-white shadow mt--2">
              {" "}
              {/** bg-secondary */}
              <CardBody className="mt--2">
                <Row className="align-items-center">
                  <Col sm="4">
                    <h6 className="heading-small text-muted mb-3">Request information</h6>
                  </Col>
                  <Col className="text-right mb-4" sm="8">
                    {this.state.isLoading ? (
                      <>
                        <i className="fa fa-info-circle text-blue" /> &nbsp;
                        <small className="my-2 text-primary">Loading please wait...&emsp;</small>
                        <Spinner color="primary" className="reload-spinner mr-4" />
                      </>
                    ) : this.state.successMsg ? (
                      <span className="text-success mr-5 small">
                        <i className="fa fa-info-circle" /> &nbsp;
                        {this.state.successMsg}
                      </span>
                    ) : this.state.warningMsg ? (
                      <span className="text-warning mr-5 small">
                        <i className="fa fa-exclamation-triangle" /> &nbsp;
                        {this.state.warningMsg}
                      </span>
                    ) : null}
                  </Col>
                </Row>
                {/** <div className="pl-lg-3 pr-lg-3 mt--1 mb-2"> */}
                <Card className="pl-sm-4 pr-sm-4 pt-sm-3 pb-sm-0 mt--1 mb-3 shadow-xl">
                  {" "}
                  {/** text-center */}
                  <Row>
                    {/* <Col md="4">
                        <small className="text-muted">Requested By</small>
                        <h4 className="mt-1">{localStorage.getItem("UserName")}</h4>
                      </Col> */}
                    <Col md="3">
                      {operation === "Create" ? (
                        <>
                          <small className="text-muted">From Warehouse</small>
                          <div className="mt-1 mb-3">
                            <Popover
                              placement="top"
                              target={`fromWarehouse`}
                              className="popover-warning"
                              isOpen={this.state.fromWarehousePopover}
                            >
                              <PopoverBody className="text-center">
                                <p className="text-gray-dark text-xs text-center mb-2 font-weight-600">
                                  Selected From Warehouse will be applied to all the below items.
                                  Are you sure you want to continue?
                                </p>
                                <Button
                                  outline
                                  color="primary"
                                  // href="#"
                                  onClick={() =>
                                    this.handleWarehouseChange(
                                      "fromWarehouse",
                                      this.state.tempFromWarehouse,
                                      true,
                                    )
                                  }
                                  size="sm"
                                >
                                  Yes
                                </Button>
                                <Button
                                  outline
                                  color="danger"
                                  // href="#"
                                  onClick={() => this.togglePopover("fromWarehousePopover")}
                                  size="sm"
                                >
                                  No
                                </Button>
                              </PopoverBody>
                            </Popover>
                            <Input
                              bsSize="sm"
                              id="fromWarehouse"
                              type="select"
                              name="select"
                              className={
                                "form-control display-4 text-gray-dark " +
                                this.state.invalidInput.fromWarehouse
                              }
                              value={this.state.fromWarehouse}
                              //style={{ width: "auto" }} //width: 100
                              onChange={(event) =>
                                this.handleWarehouseChange("fromWarehouse", event.target.value)
                              }
                            >
                              <option value="">-- Select a Warehouse --</option>
                              {this.state.warehouseList.map((warehouse, key) => {
                                return (
                                  <option key={warehouse.WhsCode} value={warehouse.WhsCode}>
                                    {`${warehouse.WhsCode} - ${warehouse.WhsName}`}
                                  </option>
                                );
                              })}
                            </Input>
                          </div>
                        </>
                      ) : (
                        // <h4 className="mt-1">{this.getWarehouseName(this.state.fromWarehouse)}</h4>
                        <>
                          <small className="text-muted">Request#</small>
                          <h4 className="mt-1">
                            {this.state.requestDocEntry ? this.state.requestDocEntry : "NA"}
                          </h4>
                        </>
                      )}
                    </Col>
                    <Col md="3">
                      {/* <Col md={this.state.operation === "Create" ? "3" : "4"}> */}
                      <small className="text-muted">To Warehouse</small>
                      {operation === "Create" ? (
                        <div className="mt-1 mb-3">
                          <Input
                            bsSize="sm"
                            type="select"
                            name="select"
                            className={
                              "form-control display-4 text-gray-dark " +
                              this.state.invalidInput.toWarehouse
                            }
                            value={this.state.toWarehouse}
                            //style={{ width: "auto" }} //width: 100
                            onChange={(event) =>
                              this.handleWarehouseChange("toWarehouse", event.target.value)
                            }
                          >
                            <option value="">-- Select a Warehouse --</option>
                            {this.state.warehouseList.map((warehouse, key) => {
                              return (
                                <option key={warehouse.WhsCode} value={warehouse.WhsCode}>
                                  {`${warehouse.WhsCode} - ${warehouse.WhsName}`}
                                </option>
                              );
                            })}
                          </Input>
                        </div>
                      ) : (
                        <h4 className="mt-1">{this.getWarehouseName(this.state.toWarehouse)}</h4>
                      )}
                    </Col>
                    <Col md="2">
                      <small className="text-muted">Request Date</small>
                      <h4 className="mt-1">{this.state.requestDate}</h4>
                    </Col>
                    <Col md="4">
                      <small className="text-muted">Remarks</small>
                      <FormGroup className="mt-1 mb-3">
                        <Input
                          bsSize="sm"
                          rows="2"
                          type="textarea"
                          value={this.state.comments}
                          className={
                            "form-control display-4 text-gray-dark " +
                            this.state.invalidInput.comments
                          }
                          id="input-vendor-remarks"
                          placeholder="Enter Remarks"
                          onChange={(e) => this.setState({ comments: e.target.value })}
                          disabled={
                            this.state.operation === "Create"
                              ? false
                              : displayMode == displayModes.VIEW
                                ? true
                                : false
                          }
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                </Card>
                {/* Item Details */}
                <Row className="align-items-center">
                  <Col xs="5">
                    <h6 className="heading-small text-muted mb-4">Item Details</h6>
                  </Col>
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
                        {Array.isArray(this.state.itemsListForTransfer) &&
                        this.state.itemsListForTransfer.length > 0
                          ? this.state.itemsListForTransfer.map((item, key) => {
                              return (
                                <>
                                  <tr key={item.ItemCode} id={"trId" + key}>
                                    {this.state.operation === "Create" && (
                                      <td>
                                        <span
                                          id={"itemRemoval-" + key}
                                          className="btn-inner--icon mt-1 cursor-pointer"
                                          // style={{cursor: "pointer"}}
                                          onClick={() => this.handleRemoveItem(key)}
                                        >
                                          <i className="fa fa-trash text-red" />
                                        </span>
                                        <span
                                          id={"itemRemoval-" + key}
                                          className="btn-inner--icon ml-2 mb-2 pb-1 cursor-pointer"
                                          // style={{cursor: "pointer"}}
                                          onClick={() => this.handleCopyItem(item, key)}
                                        >
                                          <i className="fa fa-copy text-primary"></i>{" "}
                                          {/** fa-clone far fa-copy*/}
                                        </span>
                                      </td>
                                    )}
                                    <td>{key + 1}</td>
                                    <th scope="row" style={{ whiteSpace: "unset" }}>
                                      {/* NOTE: For GRPO row recs. that are pulled from SerivceLayer, the column name
                                      is ItemDescription */}
                                      {item.ItemDescription ? item.ItemDescription : item.ItemName}
                                    </th>
                                    <td>{item.ItemCode}</td>
                                    <td>
                                      {operation === "Create" ? (
                                        <Input
                                          bsSize="sm"
                                          type="select"
                                          name="select"
                                          className={
                                            "form-control " +
                                            this.state.invalidRowFromWarehouse[key]
                                          }
                                          value={item.FromWarehouse}
                                          //style={{ width: "auto" }} //width: 100
                                          onChange={(event) =>
                                            this.handleRowLevelWarehouseChange(
                                              key,
                                              item,
                                              event.target.value,
                                            )
                                          }
                                        >
                                          <option value="">-- Select a Warehouse --</option>
                                          {this.state.warehouseList.map((warehouse, key) => {
                                            return (
                                              <option
                                                key={warehouse.WhsCode}
                                                value={warehouse.WhsCode}
                                              >
                                                {`${warehouse.WhsCode} - ${warehouse.WhsName}`}
                                              </option>
                                            );
                                          })}
                                        </Input>
                                      ) : (
                                        this.getWarehouseName(item.FromWarehouse)
                                      )}
                                    </td>
                                    {operation === "Create" ? (
                                      // item.availableQuantity ? <td>{parseInt(item.availableQuantity)}</td> : <td>NA</td>
                                      item.availableQuantity ? (
                                        <td>
                                          {/* {parseInt(item.availableQuantity)} */}
                                          <span
                                            id={"availableQuantityPopOverBtn" + key}
                                            className="text-primary"
                                            style={{
                                              cursor: "pointer",
                                              textDecoration: "underline",
                                            }}
                                          >
                                            {/** Append extra space when it is a single digit no. This is to avoid
                                             * All Availble Qty popup flicker when hovering on a single digit no. */}
                                            {!isNaN(parseInt(item.availableQuantity)) &&
                                            parseInt(item.availableQuantity) < 10
                                              ? `${parseInt(item.availableQuantity)}.0`
                                              : parseInt(item.availableQuantity)}
                                          </span>
                                          <Popover
                                            placement="left"
                                            trigger="hover" //this will take care of onMousehover
                                            hideArrow={false}
                                            isOpen={this.state.availableQuantityPopOver[key]}
                                            target={"availableQuantityPopOverBtn" + key}
                                            /** NOTE: this DIDN'T work. Created a .scss and added a classss .popover
                                             * set the 'width' prop and it worked
                                             */
                                            // style={{width: "450px"}}
                                            toggle={() => this.toggleAvailableQuantityPopOver(key)}
                                          >
                                            <h4 className="ml-3 mt-2">Available Quantities</h4>
                                            <PopoverBody>
                                              <Table
                                                size="sm"
                                                className="ml--1 mt--2 mb-0 mr--1 table-sm"
                                              >
                                                <thead style={{ backgroundColor: "#8e7ef324" }}>
                                                  <tr>
                                                    <th scope="col">#</th>
                                                    <th scope="col">Warehouse</th>
                                                    <th scope="col">Quantity</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {Array.isArray(
                                                    item.allWarehouseAvailableQtyList,
                                                  ) && item.allWarehouseAvailableQtyList.length > 0
                                                    ? item.allWarehouseAvailableQtyList.map(
                                                        (warehouse, whKey) => {
                                                          return (
                                                            <tr
                                                              key={warehouse.WhsCode}
                                                              id={"trId" + whKey}
                                                              className="cursor-pointer"
                                                              // style={{cursor: "pointer"}}
                                                              onClick={() =>
                                                                this.handleRowLevelWarehouseChange(
                                                                  key,
                                                                  item,
                                                                  warehouse.WhsCode,
                                                                  true,
                                                                )
                                                              }
                                                            >
                                                              <td>{whKey + 1}</td>
                                                              <td className="text-primary">
                                                                {this.getWarehouseName(
                                                                  warehouse.WhsCode,
                                                                )}
                                                              </td>
                                                              <td className="text-primary">
                                                                {parseInt(warehouse.OnHand)}
                                                              </td>
                                                            </tr>
                                                          );
                                                        },
                                                      )
                                                    : null}
                                                </tbody>
                                              </Table>
                                            </PopoverBody>
                                          </Popover>
                                        </td>
                                      ) : (
                                        <td>NA</td>
                                      )
                                    ) : null}
                                    <td>
                                      {operation === "Create" ? (
                                        <Input
                                          bsSize="sm"
                                          style={{ width: 70 + "%" }}
                                          value={item.Quantity}
                                          className={"form-control"} // display-4 text-gray-dark
                                          placeholder=""
                                          type="number"
                                          onChange={(e) =>
                                            this.handleFieldChange("Quantity", e.target.value, key)
                                          }
                                        />
                                      ) : (
                                        parseFloat(item.Quantity).toFixed(2)
                                      )}
                                    </td>
                                    <td>{item.InvntryUom}</td>
                                  </tr>

                                  {
                                    Array.isArray(item.BatchNumbers) && item.BatchNumbers.length > 0
                                      ? item.BatchNumbers.map((batch, key) => {
                                          return (
                                            <>
                                              {key === 0 ? (
                                                <tr key={0} style={{ backgroundColor: "#f6f8f9" }}>
                                                  {/** fd737314 mild Orange*/}
                                                  <td style={{ backgroundColor: "#fff" }}></td>
                                                  <td>
                                                    <b>Batch#</b>
                                                  </td>
                                                  <td>
                                                    <b>Quantity</b>
                                                  </td>
                                                </tr>
                                              ) : null}
                                              <tr
                                                key={
                                                  batch.BatchNumberProperty
                                                    ? batch.BatchNumberProperty.toString()
                                                    : batch.BatchNumber.toString()
                                                }
                                              >
                                                <td></td>
                                                <td>
                                                  {batch.BatchNumberProperty
                                                    ? batch.BatchNumberProperty
                                                    : batch.BatchNumber}
                                                </td>
                                                <td>{batch.Quantity}</td>
                                              </tr>
                                            </>
                                          );
                                        })
                                      : Array.isArray(item.SerialNumbers) &&
                                          item.SerialNumbers.length > 0
                                        ? item.SerialNumbers.map((serial, key) => {
                                            return (
                                              <>
                                                {key === 0 ? (
                                                  <tr
                                                    key={0}
                                                    style={{ backgroundColor: "#f6f8f9" }}
                                                  >
                                                    {/** fd737314 mild Orange*/}
                                                    <td style={{ backgroundColor: "#fff" }}></td>
                                                    <td>
                                                      <b>Serial#</b>
                                                    </td>
                                                    <td>
                                                      <b>Quantity</b>
                                                    </td>
                                                  </tr>
                                                ) : null}
                                                <tr key={serial.InternalSerialNumber.toString()}>
                                                  <td></td>
                                                  <td>{serial.InternalSerialNumber}</td>
                                                  <td>{serial.Quantity}</td>
                                                </tr>
                                              </>
                                            );
                                          })
                                        : null
                                    /*Array.isArray(item.SerialNumbers) && item.SerialNumbers.length ?
                                  <td>{item.SerialNumbers.}</td>*/
                                  }
                                </>
                              );
                            })
                          : null}
                      </tbody>
                    </Table>
                  </CardBody>
                </Card>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </>
    );
  }
}
export default RequestDetails;

RequestDetails.propTypes = {
  operation: PropTypes.string.isRequired,
  //selectedRecord: PropTypes.object.isRequired,
  //setRecordDetails: PropTypes.func.isRequired
};
