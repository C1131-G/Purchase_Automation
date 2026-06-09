import React, { Suspense } from "react";
import ReactDatetime from "react-datetime";
import moment from "moment";
import FileSaver from "file-saver";
import ExcelJS from "exceljs";
import cloneDeep from "lodash.clonedeep";
import classnames from "classnames";
// reactstrap components
import {
  Button,
  Container,
  Card,
  CardHeader,
  CardBody,
  FormGroup,
  Input,
  InputGroupAddon,
  InputGroupText,
  InputGroup,
  Table,
  Row,
  Col,
  Spinner,
  Collapse,
  Label,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  CustomInput,
} from "reactstrap";
import Select from "react-select";
import { ChevronDown, ChevronUp } from "react-feather";
import FavouriteButton from "../../components/FavouriteButton";
import StatusColumn from "../../components/Columns/StatusColumn";
import ApproverDetailsColumn from "../../components/Columns/ApproverDetailsColumn";

import api from "../../config/api-nodejs";
import { showWarningMsg, formatDate, formatTime, round, stripHTML } from "../../config/util.js";
import Header from "../../components/Headers/Header";
import {
  portalModules,
  draftStatus as draftStatusList,
  userRoles,
  apiURIs,
  nonSAPModules,
  systemCurrency,
} from "../../config/config";
// import "./table-sort.scss";
// import"./fixed-header.scss";

const getLastMonthDate = () => {
  const date = moment();
  return date.subtract(1, "month");
};

const columnWidths = [
  { colName: "SNo", width: 5 },
  { colName: "Request#", width: 10 },
  { colName: "Status", width: 10 },
  { colName: "Document Date/Time", width: 25 },
  { colName: "Vendor Name", width: 40 },
  { colName: "Vendor Ref#", width: 25 },
  { colName: "To Warehouse", width: 25 },
  { colName: "To Bin Loc.", width: 20 },
  { colName: "Payment Due", width: 15 },
  { colName: "Target Record Doc Num", width: 15 },
  // {colName: "Originator", width: 1},
  { colName: "Remarks", width: 30 },
  { colName: "Approval Status", width: 25 },
  { colName: "Date/Time", width: 30 },
];

/**Below "style" is to remove the default "blue" color bg of "option"
 * Once this is removed, custom style from "_react-select.scss" will be used
 */
const selectStyles = {
  menu: (currentStyles) => ({
    ...currentStyles,
    width: "90%", //for Menu Items
  }),
  control: (currentStyles) => ({
    // passing in react-select's current styles
    ...currentStyles,
    width: "90%", //for Dropdown
    fontSize: "0.86rem",
    //borderColor: "#4e5154"
  }),
  option: (currentStyles, state) => ({
    ...currentStyles,
    //color: state.isSelected ? "red" : "blue",
    backgroundColor: null,
    // width: "80%",
    fontSize: "0.85rem",
    //zIndex: 999 //Didnt work!
  }),
};

class StockTransferRequestList extends React.Component {
  state = {
    operation: "",
    moduleName: "",
    modulesList: [],
    usersList: [],
    allRequestList: [],
    filteredRequestList: [],
    sort: {
      column: null,
      direction: "desc",
    },
    recordStatus: "ALL",
    count: 0,
    invalidInput: {},
    warningMsg: "",
    successMsg: "",
    isLoading: false,
    isFilterOpen: true,
    fromDate: ReactDatetime.moment(getLastMonthDate()),
    toDate: ReactDatetime.moment(new Date()),
    fileFormat: "xlsx",
    exportModal: false,
    searchKey: "",
    showNoOfApprovals: true,
  };

  toggleCollapse = () => {
    this.setState((state) => ({ isFilterOpen: !state.isFilterOpen }));
  };

  toggleExportModal = () => {
    this.setState((state) => ({ exportModal: !state.exportModal }));
  };

  handleFieldChange = (name) => (event) => {
    this.setState(
      {
        [name]: event.target.value,
        warningMsg: "",

        //rest the list whenever the User dropdown is changed
        allRequestList: [],
        filteredRequestList: [],
        count: 0,
      },
      async () => await this.getRequestDetails(),
    );
  };

  /** Disables future dates in the ReactDatetime component
   * @param {Moment Object} current We don't need to pass this argument, moment will automatically send it.
   * @returns "true" for the dates that match the given criteria- dates Before Today.
   */
  disableFutureDates = (current) => {
    return current.isBefore(new Date());
  };

  /**
   * Check if the obj. passed is a valid Moment object before calling the format() funct.
   * This is to avoid the error that was thrown when user uses the keyboard to update the date
   * @param {Moment Object} momentObj   Moment object passed from the Calendar comp.
   * @param {String}        name        'state' variable name to which the value must be set
   */
  handleDateChange = (momentObj, name) => {
    if (moment.isMoment(momentObj)) {
      this.setState(
        {
          [name]: momentObj.format("MMMM D, YYYY"),

          //rest the list whenever the User dropdown is changed
          allRequestList: [],
          filteredRequestList: [],
          count: 0,
        },
        async () => await this.getRequestDetails(),
      );
    }
  };

  /**
   * Filters POs based on the selected Vendor in the dropdown
   * @param {Event} event
   */
  handleUserChange = (selectedOriginators) => {
    this.setState(
      {
        selectedOriginators,
        warningMsg: "",

        //rest the list whenever the User dropdown is changed
        allRequestList: [],
        filteredRequestList: [],
        count: 0,
      },
      async () => await this.getRequestDetails(),
    );
  };

  /** Opens "Export" popup & displays below export options
   *    -Report Header
   *    -Column names for selection
   *    -Report name
   */
  createExportOptions = () => {
    const { selectedStatus, includeClosedCalls, moduleName, recordStatus } = this.state;
    let requestList = this.state.searchKey.length
      ? this.state.filteredRequestList
      : this.state.allRequestList;
    let requestListRenamed = [],
      renamedHeader = {};
    let columnList = [];
    let fileName =
      moduleName !== null
        ? `${moduleName}_Neo_Report_${formatDate(new Date(), "MMM D, YYYY")}`
        : `Neo_Report_${formatDate(new Date(), "MMM D, YYYY")}`;
    let reportHeader = "";

    let closedStatusSelected = false;

    if (includeClosedCalls) {
      if (Array.isArray(selectedStatus) && selectedStatus.length) {
        //if "Include Closed calls" is checked and "Closed" status is selected in the dropdown
        for (let i = 0; i < selectedStatus.length; i++) {
          if (selectedStatus[i].label === "Closed") {
            closedStatusSelected = true;
            break;
          }
        }
      }
      //if "Include Closed calls" is checked and if no value is selected in the dropdown
      else closedStatusSelected = true;
    }

    //TODO: Need to move the below block to 'handleExport', getting all the rows here
    //is UNNECESSARY
    console.log("*** requestList: " + JSON.stringify(requestList));
    requestList.forEach((request, index) => {
      renamedHeader = {};
      renamedHeader["SNo"] = index + 1;
      renamedHeader["Request#"] = request.DocNum ? request.DocNum : request.DocEntry;
      renamedHeader["Document Date/Time"] =
        `${formatDate(request.DocDate, "MMMM D, YYYY")} ${formatTime(request.DocTime)}`;

      //add below columns only for GRPO
      if (moduleName === portalModules.GRPO) {
        renamedHeader["Vendor Name"] = request.CardName;
        renamedHeader["Vendor Ref#"] = request.NumAtCard;
        renamedHeader["Payment Due"] = `${request.DocCur} ${
          request.DocCur === systemCurrency
            ? round(request.DocTotal, 3)
            : round(request.DocTotalFC, 3)
        }`;
      } else if (
        [portalModules.STOCK_TRANSFER, portalModules.STOCK_TRANSFER_REQUEST].includes(moduleName)
      ) {
        renamedHeader["To Warehouse"] = request.ToWhsCode;
        renamedHeader["To Bin Loc."] = request.U_ToBinLocation;
      }

      renamedHeader["Status"] = request.U_DraftStatus ? request.U_DraftStatus : request.DraftStatus;
      renamedHeader["Target Record Doc Num"] = request.U_TargetRecDocNum
        ? request.U_TargetRecDocNum
        : request.TargetRecDocNum;
      renamedHeader["Originator"] = request.Originator;
      renamedHeader["Remarks"] = request.Comments;

      //Loop thourgh "Approval" array & add all the above props to the 'requestListRenamed' for
      //each Approval rec.
      if (Array.isArray(request.approvers) && request.approvers.length > 0) {
        request.approvers.forEach((approver, key) => {
          //NOTE: With the prev. logic the Level#2 Approval rec. overwrote the Level#1 rec.
          //so Level#2 approval rec. appeared twice in the 'requestListRenamed' list, so duplicate
          //recs. appeared in the excel o/p

          //Add the Level1 Approval rec. to 'requestListRenamed' & add the remaining recs. to 'temp' list
          //& finally concat it to the main array
          if (key === 0) {
            renamedHeader["Level"] =
              approver.U_ApprovalLevel == "0" ? "NA" : approver.U_ApprovalLevel;
            renamedHeader["Approver"] = approver.Approver;
            renamedHeader["Approval Status"] = approver.U_DraftStatus;
            renamedHeader["Date/Time"] = approver.U_DateTime
              ? moment(approver.U_DateTime).format("LLL")
              : "NA";

            requestListRenamed.push(renamedHeader);
          } else {
            //NOTE: Decliaring a new var. with 'block' level scope to store new set of data, bcoz using the
            //using the already declared 'renamedHeader' to set the new row's data mutates the previously
            //stored data, so the 2nd Approval rows data overwrites existing (1st row) record, causing
            //duplcate recs. in the Excel
            let renamedHeader = {};
            renamedHeader["SNo"] = "";
            renamedHeader["Request#"] = "";
            renamedHeader["Document Date/Time"] = "";

            //add below columns only for GRPO
            if (moduleName === portalModules.GRPO) {
              renamedHeader["Vendor Name"] = "";
              renamedHeader["Vendor Ref#"] = "";
              renamedHeader["Payment Due"] = "";
            } else if (
              [portalModules.STOCK_TRANSFER, portalModules.STOCK_TRANSFER_REQUEST].includes(
                moduleName,
              )
            ) {
              renamedHeader["To Warehouse"] = "";
              renamedHeader["To Bin Loc."] = "";
            }
            renamedHeader["Status"] = "";
            renamedHeader["Target Record Doc Num"] = "";
            renamedHeader["Originator"] = "";
            renamedHeader["Remarks"] = "";

            renamedHeader["Level"] = approver.U_ApprovalLevel;
            renamedHeader["Approver"] = approver.Approver;
            renamedHeader["Approval Status"] = approver.U_DraftStatus;
            renamedHeader["Date/Time"] = approver.U_DateTime
              ? moment(approver.U_DateTime).format("LLL")
              : "NA";

            //NOTE: Since 'renamedHeader' is block level it has to be 'pushed' to 'requestListRenamed'
            //within the 'block'
            requestListRenamed.push(renamedHeader);
          }
        });
      } else {
        renamedHeader["Approver"] = "Self";

        requestListRenamed.push(renamedHeader);
      }

      //Add "Closed Date" to Excel export if the "Closed" status is selected in the dropdown
      /*if (closedStatusSelected) {
        renamedHeader["Closed Date"] = request.closedDate != null ? formatDate(request.closedDate, "MMM D, YYYY") : "NA";
        //renamedHeader["Resolution"] = request.resolution //this field didnt pull any values from DB, so commenting it out
      }*/
      // requestListRenamed.push(renamedHeader);
    });

    //to create Checkbox group to enable users include/exclude columns from Excel
    //by default uncheck "Customer" column
    columnList = Object.keys(requestListRenamed[0]).map((key) => {
      //default-check Customer col. only when Cust. name is not selected in the Filter portlet
      /*if (key !== "Customer" || (key === "Customer" && customerId === null))
        return { colName: key, isIncluded: true };
      else
      */
      return { colName: key, isIncluded: true };
    });

    //If Cust. is not selected in the Filter portlet don't add Customer name to Report header
    reportHeader =
      recordStatus !== "ALL"
        ? `${recordStatus} - POS Report - ${formatDate(new Date(), "MMM D, YYYY")}`
        : `POS Report - ${formatDate(new Date(), "MMM D, YYYY")}`;
    this.setState({ requestListRenamed, reportHeader, columnList, fileName });
    this.toggleExportModal();
  };

  /**
   * Includes/excludes columns before exporting the data to Excel
   * @param {Event} event
   * @param {String} colName
   */
  handleExportColListChange = (event, colName) => {
    let { columnList } = this.state;
    for (let i = 0; i < columnList.length; i++) {
      if (columnList[i].colName === colName) {
        columnList[i].isIncluded = event.target.checked;
        break;
      }
    }
    //console.log("Updated columnList: "+JSON.stringify(columnList));
    this.setState({ columnList });
  };

  /**
   * Generates Excel report using options selected in the "Export" popup
   */
  handleExport = async () => {
    this.toggleExportModal();
    const { columnList, reportHeader } = this.state;
    let requestListRenamed = cloneDeep(this.state.requestListRenamed);
    let sheetColumns = [],
      columns = [],
      rows = [];
    let workbook, worksheet;
    let isVendorNameColSelected = false,
      isRemarksColSelected = false;

    let file = this.state.fileName.length
      ? `${this.state.fileName}.${this.state.fileFormat}`
      : `POS Report.${this.state.fileFormat}`;

    /**
     * 150 Records, Deleting 5 keys
     * "Create new requestList": 2.35986328125ms,
     * "Delete a key": 0.60986328125ms
     *
     * 470+, 6 keys - UMB, Date: 2018 to 2020
     * Create new requestList: 6.976806640625ms
     * Delete a key: 2.85595703125ms
     */

    /* Tested below block to try and replace "delete" block with this,
      * but (above) test results showed that "delete" is faster than creating new Array of objects
    let filteredRequest = {};
    let filteredRequestList = [];
    console.time("Create new requestList");
    requestListRenamed.forEach(request => {
      columnList.forEach(column => {
        if(column.isIncluded === true) {
          filteredRequest[column.colName] = request[column.colName]
        }
      });
      filteredRequestList.push(filteredRequest);
    });
    console.log(JSON.stringify(filteredRequestList));
    console.timeEnd("Create new requestList");
    */

    console.time("Delete a key");
    requestListRenamed.forEach((item) => {
      columnList.forEach((column) => {
        if (column.isIncluded === false) {
          delete item[column.colName];
        }
      });
    });
    console.timeEnd("Delete a key");

    try {
      //Create workbook
      workbook = new ExcelJS.Workbook();
      workbook.creator = "Neo";
      workbook.created = new Date();

      //Add worksheet
      worksheet = workbook.addWorksheet("Report");
      /*//NOTE: headerFooter didnt add any Header or Footer to the sheet
      , {
        headerFooter:{firstHeader: `Open Tickets Report - ${formatDate(new Date(), "MMM D, YYYY")}`,
          firstFooter: ".........."}
      });*/
      worksheet.views = [
        { state: "frozen", xSplit: 2, ySplit: 3, activeCell: "B4" }, //, topLeftCell: "G10",
      ];

      //Add Header
      worksheet.mergeCells("A1", "B2");
      worksheet.mergeCells("C1", "D1");
      worksheet.getCell("C1").value = reportHeader;
      worksheet.mergeCells("C2", "D2");
      worksheet.mergeCells("E1", "M2");

      /*
      //Add column headers & set width
      columnList.forEach(colList => {
        columnWidths.forEach(colHeader => {
          if(colList.isIncluded === true && colList.colName === colHeader.colName)
            sheetColumns.push({ header: colList.colName, key: colList.colName, width: colHeader.width })
        });
      });
      worksheet.columns = sheetColumns;
      */

      //Add column "keys" without "header" so this "width" will be applied to below "table" without adding column heads
      columnList.forEach((colList) => {
        columnWidths.forEach((colHeader) => {
          if (colList.isIncluded === true && colList.colName === colHeader.colName)
            sheetColumns.push({ key: colList.colName, width: colHeader.width });
        });

        //moved from below
        if (colList.isIncluded === true) {
          columns.push({ name: colList.colName }); //["SNo", "Request#",...]

          //the below two flags will be used to check if 'Vendor Name' & 'Remarks' cols. are chosen
          //for export. Only if these cols. are selected by the user, code that sets 'word-wrap' style
          //will be executed. WO this check an error will be thrown if 'word-wrap' is applied on a
          //col. that doesnt exist
          if (colList.colName === "Vendor Name") {
            isVendorNameColSelected = true;
          }
          if (colList.colName === "Remarks") {
            isRemarksColSelected = true;
          }
        }
      });
      worksheet.columns = sheetColumns;

      //Moved these lines after setting "Row" specific styles
      //worksheet.getColumn("Problem_Summary").alignment = { wrapText: true };
      //worksheet.getColumn("Problem_Detail").alignment = { wrapText: true, vertical: "top" };

      //Add Columns & Rows

      //Moved the beloc logic to above forEach, to avoid uncessarily looping through the 'columnList'
      //array twice

      /*columnList.forEach(colList => {
        if(colList.isIncluded === true)
          columns.push({ name: colList.colName }) //["SNo", "Request#",...]
      });*/
      rows = requestListRenamed.map((request) => {
        //returns an array of a given object's property values
        return Object.values(request); //["2492870", "Object Mapping For Modifications",...]
      });

      /** NOTE: Adding request Details to a "table" within "worksheet" and then adding it to worksheet,
       * instead of adding request Details directly to the worksheet itself
       * This way I can add "Header" to the table to display Customer Name & Date.
       * The downside of using this method is, I can't access indivdual columns using column "key".
       */
      worksheet.addTable({
        name: "NeoReportTable",
        ref: "A3",
        headerRow: true,
        totalsRow: false,
        style: {
          theme: "TableStyleLight1",
          showRowStripes: false,
        },
        columns: columns,
        rows: rows,
      });

      for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
        //Style for rows other than Sheet Header & Column Headers
        if (rowNum > 3) {
          worksheet.getRow(rowNum).height = 23;
          worksheet.getRow(rowNum).font = { name: "Trebuchet MS", size: 10 };
          worksheet.getRow(rowNum).alignment = { vertical: "top" };
        }
        //underline: "double", bold: true, color: { argb: "FF00FF00" }, italic: true }
      }
      /** NOTE: If below two lines are added before the above "for" loop, the above "Row" specific
       * alignments overwrites the below "Column" specific text-wrap alignments.
       * So adding these lines after "Row" styles are set
       */
      // if(worksheet.getColumn("Vendor Name"))
      // if(this.state.moduleName === portalModules.GRPO)

      if (isVendorNameColSelected)
        worksheet.getColumn("Vendor Name").alignment = { wrapText: true, vertical: "top" };

      if (isRemarksColSelected)
        worksheet.getColumn("Remarks").alignment = { wrapText: true, vertical: "top" };

      for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
        //Style for Header row
        if (rowNum < 3) {
          worksheet.getRow(rowNum).height = 25;
          worksheet.getRow(rowNum).font = { name: "Trebuchet MS", size: 12, bold: true };
          worksheet.getRow(rowNum).alignment = { vertical: "middle", horizontal: "center" };
        }
        //Style for Column headers
        else if (rowNum === 3) {
          worksheet.getRow(rowNum).height = 20;
          worksheet.getRow(rowNum).font = {
            name: "Trebuchet MS",
            size: 10,
            bold: true,
            color: { argb: "d60331" },
          };
          /** Added to set Problem_Summary & Problem_Detail column v-alignment to bottom,
           * as above "column" specific alignment will overwrite this
           */
          worksheet.getRow(rowNum).alignment = { vertical: "bottom" };
        }
      }

      /*
      // set thin green border around A3
      worksheet.getCell("A3").border = {
        top: {style:"thin", color: {argb:"FF00FF00"}}, //double, medium, thick, dotted
        left: {style:"thin", color: {argb:"FF00FF00"}},
        bottom: {style:"thin", color: {argb:"FF00FF00"}},
        right: {style:"thin", color: {argb:"FF00FF00"}}
      };
      */

      /* None of the below TWO options worked
      // add image to workbook by filename
      const logo = workbook.addImage({
        // filename: "../../assets/img/brand/n-logo.png", //DIDN'T work
        // filename: "./n-logo.png", //DIDN't Work either
        extension: "png",
      });*/

      /* #1
      // insert an image over B2:D6
      worksheet.addImage(logo, "A1:C2");
      */

      /* #2
      //add an image to a cell and then define its width and height in pixels
      worksheet.addImage(logo, {
        tl: { col: 0, row: 0 },
        ext: { width: 500, height: 200 }
      });
      */

      /*
      //Get a row object
      const row = worksheet.getRow(5);
      // Set a specific row height
      row.height = 42.5;
      */

      //workbook.xlsx.writeFile(file);
      const buffer = await workbook.xlsx.writeBuffer();
      return FileSaver.saveAs(new Blob([buffer], { type: "application/octet-stream" }), file);
    } catch (error) {
      const err = error;
      console.log("handleExport - error: ", JSON.stringify(err));
      this.setState({ warningMsg: error.message });
    }
  };

  /**
   * Gets the list of Warehouses/Bin Locations from the resp. APIs and sets them to "state"
   * @param {String} type "Warehouse" or "BinLocation"
   */
  loadDropdownList = async (type) => {
    this.setState({ isLoading: true });
    let stateVariable = "",
      usersList = [];
    let uri, response;
    if (type === "Modules") {
      stateVariable = "modulesList";
      uri = "modules";
    } else if (type === "Users") {
      uri = "portal-users";
    }
    try {
      //const response = await axios.get(uri); //added for calling Mock API
      response = await api.get("custom/" + uri);
      response = response.data;
      // console.log(`${type} List: ${JSON.stringify(response)}`);
      if (Array.isArray(response) && response.length) {
        if (type === "Modules") {
          this.setState({
            [stateVariable]: response,
            isLoading: false,
          });
        } else if (type === "Users") {
          usersList = response.map((user) => {
            return { value: user.U_UserId, label: user.UserName };
          });
          this.setState({ usersList, isLoading: false });
        }
      }
    } catch (error) {
      this.setState({ warningMsg: error.response.data.message, isLoading: false });
    }
  };

  /**
   * Gets all Request details from API and sets them to state variables
   */
  getRequestDetails = async () => {
    console.log("Index - getRequestDetails() this.state.recordStatus: " + this.state.recordStatus);

    const { selectedOriginators } = this.state;
    if (!this.state.moduleName) {
      this.setState({
        warningMsg: "", //Select a Module Name to filter records!

        //rest the list whenever the the Module dropdown is cleared
        allRequestList: [],
        filteredRequestList: [],
        count: 0,
      });
    }

    /*
    //was used when multiple Originator selection is disabled
    else if(!selectedOriginators) {
      this.setState({
        warningMsg : "Select an Originator to continue!",

        //rest the list whenever the the Originator dropdown is cleared
        allRequestList: [],
        filteredRequestList : [],
        count: 0
      });
    }*/ else {
      this.setState({ isLoading: true });
      let filteredRequestList = [];
      const { recordStatus, fromDate, toDate } = this.state;
      const uri = apiURIs[this.state.moduleName];
      console.log("uri: " + uri);

      let originatorIds = [];
      //was used when multiple Originator selection is disabled
      // let originatorIds = selectedOriginators.value;

      //TODO: Commenting it for now to send single User ID
      // let originatorIds = [];
      //send ALL users' IDs when no Originator is selected
      if (Array.isArray(selectedOriginators) && selectedOriginators.length > 0) {
        originatorIds = selectedOriginators.map((originator) => originator.value);
      } else {
        originatorIds = this.state.usersList.map((user) => user.value);
      }
      // console.log("originatorIds: "+ JSON.stringify(originatorIds));

      const filterParams = {
        //only ADMIN users has the ability to view other Users' records
        userRole: userRoles.ADMIN,
        userId: localStorage.getItem("InternalKey"),
        status: recordStatus,
        fromDate: moment(fromDate).format("YYYYMMDD"), //DD-MM-YYYY
        toDate: moment(toDate).format("YYYYMMDD"),
        originatorIds,
      };
      try {
        const response = await api.get("/custom/" + uri, { params: filterParams });
        console.log(`getRequestDetails response.data: ${JSON.stringify(response.data)}`);
        if (Array.isArray(response.data) && response.data.length) {
          if (recordStatus === "ALL" || !recordStatus) filteredRequestList = response.data;
          else {
            filteredRequestList = response.data.filter((request) => {
              if (request.U_DraftStatus) return request.U_DraftStatus == this.state.recordStatus;
              else {
                return request.DraftStatus == this.state.recordStatus;
              }
            });
          }
          this.setState({
            allRequestList: response.data,
            filteredRequestList,
            count: response.data.length,
          });
        }
      } catch (error) {
        console.log(" error.data: " + JSON.stringify(error));
        this.setState({ warningMsg: error.message });
      } finally {
        this.setState({ isLoading: false });
      }
    }
  };

  /**
   * Filters GRPODrafts based on the 'searchKey' and returns the matching records.
   * @param {String} searchKey GRPODraft First Name or Last Name
   */
  handleSearch = (searchKey) => {
    console.log(`Index - handleSearch - ${searchKey}`);
    searchKey = searchKey.trim();
    const { allRequestList } = this.state;
    let filteredRequestList = [];

    if (isNaN(searchKey)) {
      searchKey = searchKey.toUpperCase();
    }
    allRequestList.forEach((request) => {
      if (
        (request.DocEntry && request.DocEntry.toString().indexOf(searchKey) > -1) ||
        (request.DocNum && request.DocNum.toString().indexOf(searchKey) > -1) ||
        (request.U_DraftDocEntry && request.U_DraftDocEntry.toString().indexOf(searchKey) > -1) ||
        (request.U_TargetRecDocNum &&
          request.U_TargetRecDocNum.toString().indexOf(searchKey) > -1) ||
        (request.TargetRecDocNum && request.TargetRecDocNum.toString().indexOf(searchKey) > -1) ||
        (request.CardName && request.CardName.toUpperCase().indexOf(searchKey) > -1) ||
        (request.NumAtCard && request.NumAtCard.toUpperCase().indexOf(searchKey) > -1) ||
        (request.Comments && request.Comments.toUpperCase().indexOf(searchKey) > -1) ||
        (request.U_DraftStatus && request.U_DraftStatus.toUpperCase().indexOf(searchKey) > -1) ||
        (request.DraftStatus && request.DraftStatus.toUpperCase().indexOf(searchKey) > -1) ||
        (request.Originator && request.Originator.toUpperCase().indexOf(searchKey) > -1)
      ) {
        filteredRequestList.push(request);
      }
      /*if(Array.isArray(request.approvers) && request.approvers.length > 0) {
        request.approvers.forEach(approver => {
          if(approver.Approver && approver.Approver.toUpperCase().indexOf(searchKey) > -1
            || (approver.U_DraftStatus && approver.U_DraftStatus.toUpperCase().indexOf(searchKey) > -1))
          {
            filteredRequestList.push(request);
          }
        });
      }*/
    });
    //console.log(`filteredRequestList: ${JSON.stringify(filteredRequestList)}`);
    this.setState({
      filteredRequestList,
      count: filteredRequestList.length,
      recordStatus: "ALL",
    });
  };

  handleSort = (column) => (e) => {
    /** sorting recs. based on DocDate didnt work as expected, so using this hack
     * As sorting recs. based on DocEntry
     * gives teh same result, using DocEntry for Document Date col. as well
     */
    let actualColumn = column;
    if (column === "DocDate") column = "DocEntry";

    const direction = this.state.sort.column
      ? this.state.sort.direction === "asc"
        ? "desc"
        : "asc"
      : "desc";
    const sortedData = this.state.filteredRequestList.sort((a, b) => {
      //Sorting dates return inconsistent results. It doesnt sort dates correctly at times
      /*if (column === "DocDate") {
        return new Date(a[column]) - new Date (b[column]);
      }
      else */
      if (a[column] && b[column] && isNaN(a[column]) && isNaN(b[column])) {
        const valueA = a[column].toUpperCase();
        const valueB = b[column].toUpperCase();
        if (valueA < valueB) {
          return -1;
        }
        if (valueA > valueB) {
          return 1;
        }
        //names are equal
        return 0;
      } else {
        return a[column] - b[column];
      }
    });

    if (direction === "desc") {
      sortedData.reverse();
    }

    this.setState({
      filteredRequestList: sortedData,
      sort: {
        column: actualColumn, //this to show the arrow on the sorted col.
        direction,
      },
    });
  };

  setSortArrow = (column) => {
    let className = "sort-direction";
    if (this.state.sort.column === column) {
      className += this.state.sort.direction === "asc" ? " asc" : " desc";
    }
    return className;
  };

  async componentDidMount() {
    if (!Array.isArray(this.state.modulesList) || !this.state.modulesList.length) {
      await this.loadDropdownList("Modules");
    }
    if (!Array.isArray(this.state.usersList) || !this.state.usersList.length) {
      await this.loadDropdownList("Users");
    }
    /**
     * When a Draft is updated, "operation" will be set as "Saved", in which case updated Draft records must
     * be fetched from API.
     * When Edit popup is closed "operation" will be set as "Cancel", NO action is required at that time
     */
    if (this.state.operation !== "Cancel") {
      await this.getRequestDetails();
    }
  }

  render() {
    const { moduleName } = this.state;
    let requestTableHeader = [
      { label: "#" },
      { label: "Request#", sortField: "DocEntry" },
      { label: "Document Date/Time", sortField: "DocDate" },
      // { label: "To Warehouse", sortField: "ToWhsCode" },
      { label: "Status", sortField: "U_DraftStatus" },
      { label: "Approver Details" },
      { label: "Originator", sortField: "Originator" },
    ];
    if (this.state.showNoOfApprovals) {
      let col = { label: "No. Of Approvals" };
      if (
        [portalModules.ISSUE_FOR_PRODUCTION, portalModules.RECEIPT_FROM_PRODUCTION].includes(
          moduleName,
        )
      ) {
        col.sortField = "NoOfApprovals";
      } else {
        col.sortField = "U_NoOfApprovals";
      }
      requestTableHeader.push(col);
    }

    if (moduleName === portalModules.GRPO) {
      requestTableHeader.splice(2, 0, { label: "Vendor Name", sortField: "CardName" });
      requestTableHeader.splice(3, 0, { label: "Vendor Ref#", sortField: "NumAtCard" });
      requestTableHeader.splice(4, 0, { label: "Payment Due", sortField: "DocTotal" });
    } else if (
      [portalModules.STOCK_TRANSFER, portalModules.STOCK_TRANSFER_REQUEST].includes(moduleName)
    ) {
      requestTableHeader.splice(2, 0, { label: "To Warehouse", sortField: "ToWhsCode" });
      requestTableHeader.splice(3, 0, { label: "To Bin Loc.", sortField: "U_ToBinLocation" });
    }
    return (
      <>
        {/* Page content */}
        <Row>
          <Col className="order-xl-1" xl="12">
            {/** GRPODraft Table */}
            <Row>
              <Col className="mb-5 mb-xl-0" xl="12">
                <Card className="bg-white shadow">
                  <CardHeader className="border-0 mb--4 mt--2">
                    {" "}
                    {/** bg-white */}
                    <Row className="align-items-center mt--1">
                      <Col md="8">
                        {/* <h3 className="mb-1.5"> GRPODraft List </h3> */}
                        <div className="mb-2 mt--2">
                          <i className="fa fa-info-circle text-blue" /> &nbsp;
                          <small>
                            Select a Module Name, use below options to filter the records. Click on
                            a Request# to view its details
                          </small>
                        </div>
                      </Col>
                      <Col className="text-right" md="3">
                        <div className="mb-2 mt--2">
                          {this.state.successMsg ? (
                            <span className="text-success mr-20 small">
                              <i className="fa fa-info-circle" /> &nbsp;
                              {this.state.successMsg}
                            </span>
                          ) : this.state.warningMsg ? (
                            <span className="text-warning mr-20 small">
                              <i className="fa fa-exclamation-triangle" /> &nbsp;
                              {this.state.warningMsg}
                            </span>
                          ) : null}{" "}
                          &emsp;
                        </div>
                      </Col>
                      <Col className="text-right" md="1">
                        {/* <FavouriteButton /> */}
                      </Col>
                    </Row>
                    <Card className="bg-white shadow mb-4 mb-1 pb-0">
                      <CardHeader className="border-0 mb--4 mt-0 pb-1">
                        {" "}
                        {/** bg-white */}
                        <Row className="align-items-center mt--1">
                          <Col sm="3" md="4">
                            <h3>Filters</h3>
                          </Col>
                          <Col sm="6" md="5"></Col>
                          <Col sm="2">
                            {this.state.isLoading && (
                              <>
                                <Spinner color="primary" className="reload-spinner" />
                                <small className="mt-1 mb-3 ml-3 text-primary">Processing...</small>
                              </>
                            )}
                          </Col>
                          <Col xs="1" className="ml-0">
                            {!this.state.isFilterOpen ? (
                              <ChevronDown
                                className="text-primary cursor-pointer"
                                style={{ marginTop: "-15px" }}
                                size={16}
                                onClick={this.toggleCollapse}
                              />
                            ) : (
                              <ChevronUp
                                className="cursor-pointer"
                                style={{ marginTop: "-15px" }}
                                size={16}
                                onClick={this.toggleCollapse}
                              />
                            )}
                          </Col>
                        </Row>
                      </CardHeader>
                      <CardBody className="mt--1 mb--4">
                        <Collapse isOpen={this.state.isFilterOpen}>
                          <Row className="text-left mb-3">
                            <Col sm="6" md="3" className="mt-1">
                              <FormGroup>
                                <small className="text-muted">Module Name</small>
                                <Input
                                  bsSize="sm"
                                  type="select"
                                  value={moduleName}
                                  style={{ width: "auto" }}
                                  className={
                                    "form-control display-4 text-gray-dark " +
                                    this.state.invalidInput.moduleName
                                  }
                                  onChange={this.handleFieldChange("moduleName")}
                                >
                                  <option key={0} value={""}>
                                    Select a Module
                                  </option>
                                  {this.state.modulesList.map((mod) => {
                                    //Exclude certain Modules from the dropdown
                                    if (!nonSAPModules.includes(mod.U_ModuleName)) {
                                      return (
                                        <option key={mod.U_ModuleId} value={mod.U_ModuleName}>
                                          {mod.U_ModuleName}
                                        </option>
                                      );
                                    }
                                  })}
                                </Input>
                              </FormGroup>
                            </Col>
                            <Col sm="6" md="3" className="mt-1">
                              <small className="text-muted">Status</small>
                              <Input
                                bsSize="sm"
                                style={{ width: "178" + "px" }}
                                type="select"
                                value={this.state.recordStatus}
                                onChange={this.handleFieldChange("recordStatus")}
                                className="form-control display-4 text-gray-dark"
                              >
                                <option value="ALL">All</option>
                                <option value={draftStatusList.PENDING}>Pending</option>
                                <option value={draftStatusList.APPROVED}>Approved</option>
                                <option value={draftStatusList.REJECTED}>Rejected</option>
                                <option value={draftStatusList.AUTO_APPROVED}>Auto Approved</option>
                              </Input>
                            </Col>
                            <Col sm="6" md="3">
                              <small className="text-muted">From Date</small>
                              <FormGroup className="mt-1">
                                <InputGroup>
                                  <i className="ni ni-calendar-grid-58 mt-1" />
                                  <ReactDatetime
                                    inputProps={{
                                      className:
                                        "text-gray-dark mr-3 ml-2 mt--5 border-0 cursor-pointer",
                                      readOnly: true, //to block user from modifying date using keyboard
                                    }}
                                    value={this.state.fromDate}
                                    onChange={(momentObj) =>
                                      this.handleDateChange(momentObj, "fromDate")
                                    }
                                    isValidDate={this.disableFutureDates}
                                    timeFormat={false}
                                    dateFormat={"MMMM D, YYYY"}
                                    closeOnSelect={true}
                                  />
                                </InputGroup>
                              </FormGroup>
                            </Col>
                            <Col sm="6" md="3">
                              <small className="text-muted">To Date</small>
                              <FormGroup className="mt-1">
                                <InputGroup>
                                  <i className="ni ni-calendar-grid-58 mt-1" />
                                  <ReactDatetime
                                    inputProps={{
                                      className:
                                        "text-gray-dark mr-3 ml-2 mt--5 border-0 cursor-pointer",
                                      readOnly: true, //to block user from modifying date using keyboard
                                    }}
                                    value={this.state.toDate}
                                    onChange={(momentObj) =>
                                      this.handleDateChange(momentObj, "toDate")
                                    }
                                    isValidDate={this.disableFutureDates}
                                    timeFormat={false}
                                    dateFormat={"MMMM D, YYYY"}
                                    closeOnSelect={true}
                                  />
                                </InputGroup>
                              </FormGroup>
                            </Col>
                            <Col md="6" className="mb-sm-0 mb-md-0 ml-md-0 mt-md--2">
                              <small className="text-muted">Originators</small>
                              <Select
                                styles={selectStyles}
                                closeMenuOnSelect={true}
                                isClearable={true}
                                //defaultValue={this.state.queueList[0]}
                                isMulti={true}
                                name="usersList"
                                options={this.state.usersList}
                                className="React"
                                classNamePrefix="select"
                                value={this.state.selectedOriginators}
                                onChange={this.handleUserChange}
                              />
                            </Col>
                            <Col md="5" className="mt-1">
                              <FormGroup
                                className={classnames({
                                  focused: this.state.searchAltFocused,
                                })}
                              >
                                <InputGroup className="input-group mb--4 ml-0 mt-3" size="sm">
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
                                    onKeyUp={(e) => this.handleSearch(e.target.value)}
                                  />
                                </InputGroup>
                              </FormGroup>
                            </Col>
                            {Array.isArray(this.state.filteredRequestList) &&
                              this.state.filteredRequestList.length > 0 && (
                                <Col md="1" className="mt-3 pt-1 text-right">
                                  <Button
                                    size="sm"
                                    color="primary"
                                    type="button"
                                    onClick={this.createExportOptions}
                                  >
                                    Export
                                  </Button>
                                </Col>
                              )}
                          </Row>
                        </Collapse>
                      </CardBody>
                    </Card>
                  </CardHeader>
                  {/**<Card className="mt--2 shadow">
                <CardBody> */}
                  {/**
                 * NOTE: Adding 'table-fixed-head' to <div> tag didn't make the thead sticky
                 * replacing it with <Card> worked
                    <div className="table-fixed-head table-fixed-head-lg">
                */}
                  <Card className="table-fixed-head table-fixed-head-lg">
                    <Table size="sm" className="align-items-center table-flush" responsive>
                      <thead className="thead-light">
                        <tr>
                          {requestTableHeader.map((headerCol, key) => {
                            return (
                              <th
                                scope="col"
                                key={headerCol.label}
                                onClick={this.handleSort(headerCol.sortField)}
                                className="cursor-pointer"
                                style={{
                                  textAlign:
                                    headerCol.label === "Approver Details" ? "center" : "auto",
                                }}
                              >
                                {headerCol.label}
                                <span className={this.setSortArrow(headerCol.sortField)} />
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(this.state.filteredRequestList) &&
                        this.state.filteredRequestList.length ? (
                          this.state.filteredRequestList.map((request, key) => {
                            return (
                              <tr key={request.DocEntry}>
                                <td>{key + 1}</td>
                                <th className="mb-0 text-sm" scope="row">
                                  <a
                                    style={{ cursor: "pointer", textDecoration: "underline" }}
                                    onClick={
                                      () =>
                                        this.props.setRecordDetails(
                                          "View",
                                          request,
                                          2,
                                          userRoles.ADMIN,
                                          moduleName,
                                        )
                                      // ? () => this.props.setRecordDetails("Edit", request, 3, this.props.userRole)
                                    }
                                  >
                                    {/** Display GRPO for AUTO_APPROVED recs. for the rest show the Draft's
                                     * DocEntry (bocz for Drafts DocNums are not unique)
                                     */}
                                    {/* moduleName === portalModules.GRPO */}
                                    {request.DocNum ? request.DocNum : request.DocEntry}
                                    {request.U_DraftDocEntry ? "** " + request.U_DraftDocEntry : ""}
                                  </a>
                                </th>
                                {/* style={{width:"10px"}} */}
                                <td>
                                  {formatDate(request.DocDate, "MMMM D, YYYY")}
                                  &nbsp; {formatTime(request.DocTime)}
                                </td>
                                {moduleName === portalModules.GRPO && (
                                  <>
                                    <td style={{ whiteSpace: "unset" }}>
                                      <b>{request.CardName}</b>
                                    </td>
                                    <td style={{ whiteSpace: "normal" }}>{request.NumAtCard}</td>
                                    <td>
                                      {`${request.DocCur} ${
                                        request.DocCur === systemCurrency
                                          ? round(request.DocTotal, 3)
                                          : round(request.DocTotalFC, 3)
                                      }
                                  `}
                                    </td>
                                  </>
                                )}
                                {[
                                  portalModules.STOCK_TRANSFER,
                                  portalModules.STOCK_TRANSFER_REQUEST,
                                ].includes(moduleName) && (
                                  <>
                                    <td>{request.ToWhsCode}</td>
                                    <td>
                                      {request.U_ToBinLocation ? request.U_ToBinLocation : "NA"}
                                    </td>
                                  </>
                                )}

                                {/* <td><b>{request.ItemCode}</b></td>
                            <td style={{whiteSpace: "unset"}}>{request.ItemName}</td>
                            <td>{request.Quantity}</td>
                            <td>{request.unitMsr}</td> */}
                                {/*** NOTE: added style={{whiteSpace: 'unset'}} - to word-wrap the cell content */}
                                {/* Hiding Remarks
                            <td style={{width:"20%", whiteSpace: "unset"}}>{request.Comments}</td> */}
                                {/* <td>{request.FromWhsCod}</td> */}
                                {/* <td>{request.ToWhsCode}</td> */}
                                <td style={{ width: "10%", textAlign: "left" }}>
                                  <StatusColumn
                                    status={
                                      request.U_DraftStatus
                                        ? request.U_DraftStatus
                                        : request.DraftStatus
                                    }
                                    targetRecDocNum={
                                      request.U_TargetRecDocNum
                                        ? request.U_TargetRecDocNum
                                        : request.TargetRecDocNum
                                          ? request.TargetRecDocNum
                                          : ""
                                    }
                                  />
                                </td>
                                <td>
                                  <ApproverDetailsColumn
                                    approverDetails={request.approvers}
                                    multiLevelApproval={request.U_MultiLevelApproval === "Y"}
                                    showDateTime
                                  />
                                </td>
                                <td>{request.Originator}</td>
                                {this.state.showNoOfApprovals && (
                                  <td>
                                    {request.U_NoOfApprovals
                                      ? request.U_NoOfApprovals
                                      : request.NoOfApprovals
                                        ? request.NoOfApprovals
                                        : " NA"}
                                  </td>
                                )}
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            {/** Warning msg should span across the width of the table, so setting 'colSpan' with no. of columns */}
                            <td colSpan={6}>
                              {this.state.isLoading ? (
                                <span className="text-primary mr-20 text-sm">
                                  Loading please wait...
                                </span>
                              ) : (
                                showWarningMsg("No records found")
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </Card>
                  {/*</CardBody></Card>*/}
                </Card>
              </Col>
            </Row>
            {/*
            <Card className="bg-white shadow">
              <CardHeader className="border-1 mb--4"> {/**bg-white}
                <Row className="align-items-center">
                  <Col xs="8">
                    <h3 className="mb-0">GRPODraft List</h3>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody className="mt--3 mb--4 shadow">
      
              </CardBody>
            </Card> */}
          </Col>
        </Row>

        <Modal
          isOpen={this.state.exportModal}
          toggle={this.toggleExportModal}
          className="modal-dialog-centered"
        >
          {/* <ModalHeader toggle={this.toggleExportModal}>Export To Excel</ModalHeader> */}
          <Card className="modal-header mt--2 mb--2">
            {/*<span className="heading-small text-muted mb-0">
              Batch Details
            </span>*/}
            <Row className="align-items-center">
              <div>
                <h3 className="text-left mb-1 mt-0 mr-4 ml-3">Export to Excel</h3>
              </div>
              <div className="text-right">
                <span className="mb-3 mt-2 pb-2">
                  <i className="fa fa-info-circle text-primary" /> &nbsp;
                  <small>Select the columns to export</small>
                </span>
              </div>
            </Row>
            <Row>
              <Col sm="12">
                {this.state.isLoading && (
                  <Spinner color="primary" size="15" className="reload-spinner mr-4" />
                )}
                {this.state.warningMsg && (
                  <span className="text-warning mr-5 small">
                    <i className="fa fa-exclamation-triangle" /> &nbsp;
                    {this.state.warningMsg}
                  </span>
                )}
              </Col>
            </Row>
          </Card>
          {/* <ModalBody> */}
          <div className="modal-body mt--1">
            <FormGroup>
              <small className="text-muted">Report Header</small>
              <Input
                bsSize="sm"
                type="text"
                className="form-control display-4 text-gray-dark"
                value={this.state.reportHeader}
                onChange={(e) => this.setState({ reportHeader: e.target.value })}
                placeholder="Enter Report Header"
              />
            </FormGroup>
            <FormGroup>
              <small className="text-muted">Columns</small>
              <br />
              {Array.isArray(this.state.columnList) && this.state.columnList.length
                ? this.state.columnList.map((column, index) => {
                    return column.colName !== "SNo" ? (
                      <CustomInput
                        inline
                        type="checkbox"
                        className="display-4 text-gray-dark"
                        key={`"${column.colName}"`}
                        id={`checkbox_${index}`}
                        label={column.colName}
                        htmlFor={`checkbox_${index}`}
                        defaultChecked={column.isIncluded}
                        disabled={
                          ["Request#", "Originator"].includes(column.colName) ? true : false
                        }
                        onChange={(e) => this.handleExportColListChange(e, column.colName)}
                      />
                    ) : null;
                  })
                : null}
            </FormGroup>
            <FormGroup>
              <small className="text-muted">Report Name</small>
              <Input
                bsSize="sm"
                type="text"
                className="form-control display-4 text-gray-dark"
                value={this.state.fileName}
                onChange={(e) => this.setState({ fileName: e.target.value })}
                placeholder="Enter File Name"
              />
            </FormGroup>
          </div>
          <div className="modal-footer">
            <Button size="sm" color="primary" onClick={this.handleExport}>
              {" "}
              {/** size="sm" */}
              Export
            </Button>
            <Button
              size="sm"
              // outline
              // color="light"
              color="danger"
              onClick={this.toggleExportModal}
            >
              {" "}
              {/**  */}
              Cancel
            </Button>
          </div>
        </Modal>
      </>
    );
  }
}

export default StockTransferRequestList;
