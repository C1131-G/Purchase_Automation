import React, { Suspense } from "react";
// node.js library that concatenates classes (strings)
import classnames from "classnames";
// reactstrap components
import {
  Card,
  CardHeader,
  CardBody,
  Container,
  Row,
  Col,
  FormGroup,
  Input,
  CustomInput,
  Table,
  Button,
  Spinner,
  Nav,
  NavItem,
  NavLink,
  Popover,
  PopoverBody,
  ListGroup,
  ListGroupItem,
} from "reactstrap";
import { ChevronsRight, Trash2, Circle, Sun, Loader } from "react-feather";

import Header from "../../../components/Headers/Header";
import Radio from "../../../components/CustomRadio/CustomRadio";
import api from "../../../config/api-nodejs";
import {
  portalModules,
  permissions,
  userRoles,
  displayModes,
  nonSAPModules,
} from "../../../config/config";
import FavouriteButton from "../../../components/FavouriteButton";
import { UserPermissionsContext } from "../../../contexts/UserPermissionsContext";

class ApprovalTemplates extends React.Component {
  static contextType = UserPermissionsContext;

  state = {
    modulesList: [],
    usersList: [],
    activeUsersList: [],
    approvalTemplatesList: [],
    activeApprovalTemplateId: "",
    originatorId: "",
    activeNewUsersList: [],
    addUser: false,
    invalidInput: {},
    action: "",
    displayMode: displayModes.VIEW,
    templateName: "",
    description: "",
    moduleId: "",
    terms: "NA",
    noOfApprovals: "",
    multiLevelApproval: "N",
    isActive: "Y",
    activeApprovalOriginatorList: [],
    activeApprovalApproverList: [],
    isLoading: false,
    successMsg: "",
    warningMsg: "",
    operation: "",
    selectedUser: {},
    approvalTemplatePopoverOpen: false,
    //approverPopoverOpen: false,
    originatorPopoverOpen: [],
    approverPopoverOpen: [],
  };

  /**
   * Handles popovers for Originator List's "delete" action
   * @param {String} action "CLOSE" or "TOGGLE"
   * @param {Number} key    Index of the array
   */
  togglePopover = (type, action, key) => {
    let popoverOpen = [];
    if (action === "OPEN") {
      popoverOpen[key] = true;
    }
    if (type === userRoles.APPROVER) this.setState({ approverPopoverOpen: popoverOpen });
    else if (type === userRoles.ORIGINATOR) this.setState({ originatorPopoverOpen: popoverOpen });
    else if (type === userRoles.TEMPLATE)
      this.setState({ approvalTemplatePopoverOpen: !this.state.approvalTemplatePopoverOpen });
  };

  handleFieldChange = (name) => (event) => {
    this.setState({
      [name]: event.target.value,
      warningMsg: "",
    });
  };

  handleCheckboxChange = (name) => (event) => {
    const value = event.target.checked;
    this.setState({ [name]: value ? "Y" : "N" });

    if (name === "multiLevelApproval") {
      let activeApprovalApproverList = this.state.activeApprovalApproverList.slice();
      if (value) {
        activeApprovalApproverList.map((item, key) => {
          item.U_ApprovalLevel = key + 1; //set the Levels based on the order in which they are added
        });
      } else {
        activeApprovalApproverList.map((item, key) => {
          item.U_ApprovalLevel = "";
        });
      }
    }
  };

  /**
   * Handles Approver & Originator list change event
   * @param {String} listType APPROVER or ORIGINATOR dropdown
   * @param {Number} key      Index position
   * @param {Event}  event
   */
  handleListChange = (listType, key, event) => {
    this.setState({ warningMsg: "" });

    //not a recommended way of Deep cloning. But trying this for time being
    const approvalTemplatesList = JSON.parse(
      JSON.stringify(this.state.approvalTemplatesList.slice()),
    );
    console.log(
      "approvalTemplatesList - listChange BEFORE: " + JSON.stringify(approvalTemplatesList),
    );

    if (listType === userRoles.APPROVER) {
      let activeApprovalApproverList = this.state.activeApprovalApproverList.slice();
      activeApprovalApproverList[key].U_UserId = event.target.value;
      activeApprovalApproverList[key].U_ApprovalLevel = key + 1;
      this.setState({
        activeApprovalApproverList,
        // noOfApprovals: activeApprovalApproverList.length,
        invalidInput: {},
      });
    } else if (listType === userRoles.ORIGINATOR) {
      //close the popover if it was open. Without this code, the page errors out when dropdown value is changed
      //when a popover is open
      this.togglePopover(userRoles.ORIGINATOR, "CLOSE", key);

      let activeApprovalOriginatorList = this.state.activeApprovalOriginatorList.slice();
      activeApprovalOriginatorList[key].U_UserId = event.target.value;
      this.setState({ activeApprovalOriginatorList });
    }
    //For some reason, the approvalTempalteList is getting mutated when activeApprovalOriginatorList is
    //set to 'state', to avoid this I'm setting back the original value
    this.setState({ approvalTemplatesList });
  };

  resetForm = () => {
    this.setState({
      activeApprovalTemplateId: "",
      templateName: "",
      description: "",
      moduleId: "",
      terms: "",
      noOfApprovals: "",
      multiLevelApproval: "N",
      isActive: "Y",
      activeApprovalOriginatorList: [
        {
          DocEntry: "",
          U_UserId: "",
        },
      ],
      activeApprovalApproverList: [
        {
          DocEntry: "",
          U_UserId: "",
          U_ApprovalLevel: "",
        },
      ],
    });
  };

  handleCreateEdit = async (action) => {
    await this.getUsersList();
    this.setState({
      action,
      displayMode: displayModes.EDIT,
      successMsg: "",
      warningMsg: "",
    });

    if (action === displayModes.CREATE) {
      const { modulesList } = this.state;
      this.resetForm();
      /*if (Array.isArray(modulesList) && modulesList.length) {
        let activePermissionsList = modulesList.map(mod => {
          return {
            U_ModuleId: "",
            U_PermissionId: "", 
            U_ModuleName: mod.U_ModuleName,
            U_ModuleId: mod.U_ModuleId,
            U_AllowRead: "N",
            U_AllowWrite: "N",
            U_AllowCancel: "N",
            U_AllowCreate: "N"
          }
        });
        this.setState({
          activePermissionsList
        });
      }*/
    }
  };

  handleSave = async () => {
    this.setState({ isLoading: true, invalidInput: {} });

    const {
      activeApprovalTemplateId,
      templateName,
      description,
      moduleId,
      terms,
      noOfApprovals,
      multiLevelApproval,
      isActive,
      activeApprovalApproverList,
      activeApprovalOriginatorList,
    } = this.state;
    const approvalTemplatesList = this.state.approvalTemplatesList.slice();
    console.log("approvalTemplatesList - save: " + JSON.stringify(approvalTemplatesList));
    let invalidInput = {};
    let activeApprovalTemplate = [];
    let invalidApprover = false;
    let invalidOriginator = false;

    if (activeApprovalApproverList.length) {
      for (let i = 0; i < activeApprovalApproverList.length; i++) {
        if (activeApprovalApproverList[i].U_UserId === "") {
          invalidApprover = true;
          break;
        }
      }
    }
    if (!invalidInput.approver && activeApprovalOriginatorList.length) {
      for (let i = 0; i < activeApprovalOriginatorList.length; i++) {
        if (activeApprovalOriginatorList[i].U_UserId === "") {
          invalidOriginator = true;
          break;
        }
      }
    }

    /*Add all Originators & Draft nos. from existing ACTIVE Approval Templates for the currently selected
      Module to this list
    */
    let existingOriginator = false;
    let existingOriginatorList = [];
    let templateList = [];
    if (Array.isArray(approvalTemplatesList) && approvalTemplatesList.length) {
      approvalTemplatesList.forEach((item) => {
        if (item.U_Active === "Y") {
          existingOriginatorList = [];
          if (moduleId && moduleId === item.U_DocumentName) {
            item.Originator.forEach((originator) => {
              existingOriginatorList.push(originator.U_UserId);
            });
          }
          templateList.push({
            approvalTemplateId: item.DocEntry,
            originators: existingOriginatorList,
          });
        }
      });
    }
    if (templateList.length && activeApprovalOriginatorList.length) {
      for (let i = 0; i < activeApprovalOriginatorList.length; i++) {
        /* set 'true' if an Originator is already added in any other Template (other than the current one)
          without the 'current' template filter, performing Update operation on Templates threw the below warning
              "Originator you have selected is already added to another Approval....."
        */
        templateList.forEach((template) => {
          if (
            template.approvalTemplateId !== activeApprovalTemplateId &&
            template.originators.includes(activeApprovalOriginatorList[i].U_UserId)
          ) {
            existingOriginator = true;
          }
        });
        if (existingOriginator) break;
      }
    }

    console.log("existingOriginatorList: " + JSON.stringify(existingOriginatorList));

    if (templateName === "") {
      invalidInput.templateName = "is-invalid";
      this.setState({
        warningMsg: "Enter a Template Name",
        invalidInput,
        isLoading: false,
      });
    } else if (moduleId === "") {
      invalidInput.moduleId = "is-invalid";
      this.setState({
        warningMsg: "Select a Module",
        invalidInput,
        isLoading: false,
      });
    } else if (invalidApprover) {
      invalidInput.approver = "is-invalid";
      this.setState({
        warningMsg: "Select an Approver to proceed",
        invalidInput,
        isLoading: false,
      });
    } else if (invalidOriginator) {
      invalidInput.originator = "is-invalid";
      this.setState({
        warningMsg: "Select an Originator to proceed",
        invalidInput,
        isLoading: false,
      });
    } /* Add the user to the current Originators list only if the user is not added as an Originator
      in another Approval Template. This is to restrict same user being added as 
      Originator under diff. Approval Templates for same module

      NOTE: If the same Originator is added to diff. Approval Temp. with diff. set of Approvers it will
      cause confusion when assigning Approvers for Drafts. The system wouldnt know which Approval Template
      to use
    */ else if (isActive === "Y" && existingOriginator) {
      invalidInput.originator = "is-invalid";
      this.setState({
        warningMsg:
          "Originator you have selected is already added to another Approval Template. Same originator cannot be added under multiple templates.",
        invalidInput,
        isLoading: false,
      });
    } else if ((!noOfApprovals || isNaN(noOfApprovals)) && multiLevelApproval !== "Y") {
      invalidInput.noOfApprovals = "is-invalid";
      this.setState({
        warningMsg: "Enter a valid value for No. of required approvals",
        invalidInput,
        isLoading: false,
      });
    } else if (parseInt(noOfApprovals) > activeApprovalApproverList.length) {
      invalidInput.noOfApprovals = "is-invalid";
      this.setState({
        warningMsg: "No. of required approvals can't be more than the no. of Approvers added",
        invalidInput,
        isLoading: false,
      });
    } else if (
      multiLevelApproval === "Y" &&
      parseInt(noOfApprovals) != activeApprovalApproverList.length
    ) {
      invalidInput.noOfApprovals = "is-invalid";
      this.setState({
        warningMsg:
          "In a multi-level approval setup no. of required approvals must be equal to than the no. of Approvers added",
        invalidInput,
        isLoading: false,
      });
    }
    //if(!invalidInput) {
    else {
      try {
        const response = await api.post("/custom/approval-template", {
          userId: localStorage.getItem("InternalKey"),
          activeApprovalTemplateId,
          templateName,
          description,
          moduleId,
          terms,
          noOfApprovals,
          multiLevelApproval,
          isActive,
          activeApprovalApproverList,
          activeApprovalOriginatorList,
        });
        if (Array.isArray(response.data) && response.data.length) {
          console.log("handleSave: " + JSON.stringify(response.data));
          //console.log("response.data[0] %s", JSON.stringify(response.data[0]));

          //TODO: set the active rec. based on teh operation,
          //ie., if the operation is Edit, set the activeTemp rec. based on the activeTemId in 'state'
          //and if the operation was "Create", set the last item in the list as activeTemRec, bcoz
          //the recently added item will be the last rec. in the response

          //currently the below logic to set last item as "active" works for both Create & Edit operation,
          //bcoz, the Created or updated record automatically bcomes the last one in the response from the API
          activeApprovalTemplate = response.data[response.data.length - 1]; //to set the last item as active rec.
          this.setState({
            approvalTemplatesList: response.data,
            activeApprovalTemplateId: activeApprovalTemplate.DocEntry,
            activeApprovalTemplate,
            templateName: activeApprovalTemplate.U_Name,
            description: activeApprovalTemplate.U_Description,
            moduleId: activeApprovalTemplate.U_DocumentName,
            terms: activeApprovalTemplate.U_Terms,
            noOfApprovals: activeApprovalTemplate.U_NoOfApprovals,
            multiLevelApproval: activeApprovalTemplate.U_MultiLevelApproval,
            isActive: activeApprovalTemplate.U_Active,
            activeApprovalApproverList: activeApprovalTemplate.Approver,
            activeApprovalOriginatorList: activeApprovalTemplate.Originator,
            successMsg: "Data saved successfully!",
            action: "",
            displayMode: displayModes.VIEW,
          });
        }
      } catch (error) {
        //console.log("error.response.data: "+ JSON.stringify(error.response.data))
        console.log("error: " + JSON.stringify(error));
        this.setState({
          warningMsg: error.response.data
            ? JSON.stringify(error.response.data)
            : JSON.stringify(error),
        });
      } finally {
        this.setState({ isLoading: false });
      }
    }
  };

  handleDelete = async (type, key) => {
    this.setState({ isLoading: true, warningMsg: "" });
    const { activeApprovalTemplateId } = this.state;
    let lineId,
      activeApprovalTemplate = [],
      apiURI;
    /*if(type === userRoles.TEMPLATE)
      this.togglePopover("approvalTemplatePopoverOpen");
    else if(type === userRoles.ORIGINATOR) {
      */
    /* Option#1
      for(let i=activeApprovalOriginatorList.length - 1; i >= 0; i--) {
        //remove the User from the Originator list in the "state" only if the record doesnt have a "LineId"
        //bcoz only the records that are not yet saved to the db will not have a "LineId"
        if(activeApprovalOriginatorList[i].U_UserId === activeApprovalTemplateId && !activeApprovalOriginatorList[i].LineId) {
          activeApprovalOriginatorList.splice(i, 1);
          break;
        }
      }*/

    //remove the User from the Originator list only from the "state" if the record doesnt have a "LineId"
    //bcoz only the records that are not yet saved to the db will not have a "LineId"

    let activeList = [],
      keyName;
    this.togglePopover(type, "CLOSE", key);
    if (type === userRoles.ORIGINATOR || type === userRoles.APPROVER) {
      keyName =
        type === userRoles.ORIGINATOR
          ? "activeApprovalOriginatorList"
          : "activeApprovalApproverList";
      activeList =
        type === userRoles.ORIGINATOR
          ? this.state.activeApprovalOriginatorList.slice()
          : this.state.activeApprovalApproverList.slice();

      console.log("key: " + key);
      console.log("activeList: " + JSON.stringify(activeList));
      lineId = activeList[key].LineId;

      if (!lineId) {
        activeList.splice(key, 1);
        console.log("activeList AFTER: " + JSON.stringify(activeList));
        this.setState({
          [keyName]: activeList,
          isLoading: false,
        });
      } else {
        apiURI = `/custom/approval-template/${type}/${activeApprovalTemplateId}/${lineId}`;
      }
    } else if (type === userRoles.TEMPLATE) {
      this.togglePopover(type);
      apiURI = `/custom/approval-template/${type}/${activeApprovalTemplateId}`;
    }
    if (apiURI) {
      try {
        // const response = await api.delete(apiURI, {userId: localStorage.getItem("InternalKey")});
        const response = await api.delete(apiURI);
        console.log("handleDelet response: " + JSON.stringify(response));

        if (Array.isArray(response.data) && response.data.length) {
          console.log("handleDelete: " + JSON.stringify(response.data));
          console.log("response.data[0] %s", JSON.stringify(response.data[0]));
          /*this.setState({
            approvalTemplatesList: response.data,
            activeApprovalTemplateId: response.data[0].DocEntry,
            activeApprovalTemplate: response.data[0],
            successMsg: "Delete operation successfull!",
            displayMode: displayModes.VIEW
          });*/
          activeApprovalTemplate = response.data[0];
          this.setState({
            approvalTemplatesList: response.data,
            activeApprovalTemplateId: activeApprovalTemplate.DocEntry,
            activeApprovalTemplate,
            templateName: activeApprovalTemplate.U_Name,
            description: activeApprovalTemplate.U_Description,
            moduleId: activeApprovalTemplate.U_DocumentName,
            terms: activeApprovalTemplate.U_Terms,
            noOfApprovals: activeApprovalTemplate.U_NoOfApprovals,
            multiLevelApproval: activeApprovalTemplate.U_MultiLevelApproval,
            isActive: activeApprovalTemplate.U_Active,
            activeApprovalApproverList: activeApprovalTemplate.Approver,
            activeApprovalOriginatorList: activeApprovalTemplate.Originator,
            successMsg: "Record deleted successfully!",
            displayMode: displayModes.VIEW,
          });
        }
      } catch (error) {
        console.log("error.response: " + JSON.stringify(error.response));
        this.setState({
          warningMsg: `${error.response.data.message}`,
        });
      } finally {
        this.setState({ isLoading: false });
      }
    }
  };

  handleCancel = async () => {
    let activeApprovalTemplate = [];
    this.setState({
      displayMode: displayModes.VIEW,
      action: "",
      successMsg: "",
      warningMsg: "",
      invalidInput: {},
      addUser: false,
    });
    //reload the screen with old records
    const { approvalTemplatesList } = this.state;
    if (Array.isArray(approvalTemplatesList) && approvalTemplatesList.length) {
      /*activeApprovalTemplate = approvalTemplatesList.filter(approval => {
        return approval.DocEntry === this.state.activeApprovalTemplateId
      });*/
      console.log("activeApprovalTemplate %s", JSON.stringify(activeApprovalTemplate));
      this.setState({
        //activeApprovalTemplate: approvalTemplatesList[0],
        activeApprovalTemplateId: approvalTemplatesList[0].DocEntry,
        templateName: approvalTemplatesList[0].U_Name,
        description: approvalTemplatesList[0].U_Description,
        moduleId: approvalTemplatesList[0].U_DocumentName,
        terms: approvalTemplatesList[0].U_Terms,
        noOfApprovals: approvalTemplatesList[0].U_NoOfApprovals,
        multiLevelApproval: approvalTemplatesList[0].U_MultiLevelApproval,
        isActive: approvalTemplatesList[0].U_Active,
        activeApprovalApproverList: approvalTemplatesList[0].Approver,
        activeApprovalOriginatorList: approvalTemplatesList[0].Originator,
      });
    } else {
      this.resetForm();
    }
  };

  handleChange = (name, value) => {
    this.setState({ [name]: value });
  };

  handleApprovalTemplateDropdownChange = (value) => {};

  handleTemplateClick = (activeApprovalTemplateId) => {
    this.setState({ warningMsg: "", invalidInput: {} });
    //perform below action only when the action != "CREATE"
    if (this.state.action != displayModes.CREATE) {
      const { approvalTemplatesList } = this.state;
      this.setState({
        approvalTemplatePopoverOpen: false,
        //approvalTemplatePopoverOpen: false,
        //originatorPopoverOpen: false
      });

      //console.log("this.state.approvalTemplatesList: "+JSON.stringify(this.state.approvalTemplatesList));
      console.log("activeApprovalTemplateId: " + activeApprovalTemplateId);
      for (let i = 0; i < approvalTemplatesList.length; i++) {
        if (approvalTemplatesList[i].DocEntry == activeApprovalTemplateId) {
          this.setState({
            activeApprovalTemplateId,
            templateName: approvalTemplatesList[i].U_Name,
            description: approvalTemplatesList[i].U_Description,
            moduleId: approvalTemplatesList[i].U_DocumentName,
            terms: approvalTemplatesList[i].U_Terms,
            noOfApprovals: approvalTemplatesList[i].U_NoOfApprovals,
            multiLevelApproval: approvalTemplatesList[i].U_MultiLevelApproval,
            isActive: approvalTemplatesList[i].U_Active,
            activeApprovalApproverList: approvalTemplatesList[i].Approver,
            activeApprovalOriginatorList: approvalTemplatesList[i].Originator,
          });
          break;
        }
      }
      /*
      * NOTE: For some reason, approvalTemplatesList.filter didnt return the filtered Template Rec.
      so 'activeApprovalTemplate' was undefined, so below 'state' variables were all undefined, and the values
      in the textboxes didnt change when Approval Template is changed

      activeApprovalTemplate = approvalTemplatesList.filter(temp => {
        console.log("temp.DocEntry: "+ temp.DocEntry);
        return temp.DocEntry == activeApprovalTemplateId;
      });*/
      /*console.log("handleTemplateClick - activeApprovalTemplate: "+ JSON.stringify(activeApprovalTemplate.U_Name));
      this.setState({
        activeApprovalTemplateId,
        activeApprovalTemplate,
        templateName: activeApprovalTemplate.U_Name,
        description: activeApprovalTemplate.U_Description,
        moduleId: activeApprovalTemplate.U_DocumentName,
        terms: activeApprovalTemplate.U_Terms,
        noOfApprovals: activeApprovalTemplate.U_NoOfApprovals,
        isActive: activeApprovalTemplate.U_Active,
      });*/
    }
  };

  /** Get All Portal modules */
  getModulesList = async () => {
    if (Array.isArray(this.state.modulesList) && this.state.modulesList.length)
      return this.state.modulesList;
    else {
      this.setState({
        isLoading: true,
      });
      try {
        let response = await api.get("custom/modules", {
          params: { userId: localStorage.getItem("InternalKey") },
        });
        console.log("modulesList: " + JSON.stringify(response));
        if (Array.isArray(response.data) && response.data.length) {
          this.setState({ modulesList: response.data });
          return response.data;
        }
      } catch (error) {
        this.setState({ warningMsg: error.response.data.message });
      } finally {
        this.setState({ isLoading: false });
      }
    }
  };

  /**
   * Get All Portal Users for dropdown
   */
  getUsersList = async () => {
    if (Array.isArray(this.state.usersList) && this.state.usersList.length)
      return this.state.usersList;
    else {
      this.setState({ isLoading: true });
      try {
        let response = await api.get("custom/portal-users", {
          params: { userId: localStorage.getItem("InternalKey") },
        });
        console.log("getUsersList - response: " + JSON.stringify(response));
        if (Array.isArray(response.data) && response.data.length) {
          this.setState({ usersList: response.data });
          return response.data;
        }
        console.log("getUsersList: " + JSON.stringify(response.data));
      } catch (error) {
        this.setState({ warningMsg: error.response.data.message });
      } finally {
        this.setState({ isLoading: false });
      }
    }
  };

  addNew = async (type) => {
    this.setState({ warningMsg: "" });
    if (type === userRoles.ORIGINATOR) {
      let activeApprovalOriginatorList = [];
      //User List to show when clicking on "Add" button
      const activeUsersList = this.state.usersList.slice();

      if (
        Array.isArray(this.state.activeApprovalOriginatorList) &&
        this.state.activeApprovalOriginatorList.length
      ) {
        //Approval Setup records, UG Category for the selected(active) Module
        activeApprovalOriginatorList = this.state.activeApprovalOriginatorList.slice();

        /** TODO: This is to remove already selected users from the new dropdown
       * Need to work on it. So commenting out for now
        activeApprovalOriginatorList.forEach(originator => {
          //Setting "isNew" as false for the recs that were added previously so the dropdown will not be shown for them
          if(originator.isNew) {
            originator.isNew = false;
          }
          for(let i=activeUsersList.length - 1; i >= 0; i--) {
            if(originator.U_UserId === activeUsersList[i].U_UserId) {
              //if a User is already added to the active Module, no need to show that in the dropdown
              activeUsersList.splice(i, 1);
            }
          }
        });
        console.log("activeUsersList.length: "+ activeUsersList.length);*/
      }
      if (activeUsersList.length > 0) {
        const originatorRec = {
          DocEntry: this.state.activeApprovalTemplateId,
          //LineId: "",
          U_UserId: "", //activeUsersList[0].U_UserId
          //UserName: activeUsersList[0].UserName
        };

        /* TODO: This is supposed to work along with teh above commented block.

        //if this is the last User in the list then don't show the dropdown. Note the "isNew" prop
        if(activeUsersList.length === 1 ) {
          approvalRec.isNew = false; //to hide the dropdown
        }
        //When activeUsersList is empty (after performing above "splice"), i.e., when all the Users are already
        //added to the active Approval setup, then do nothing when "Add" btn is clicked
        else if(activeUsersList.length !== 0 ) {
          approvalRec.isNew = true; //means the rec. is new, so dropdown will be shown (to let users change it) for this Approval recs
        }*/
        activeApprovalOriginatorList.push(originatorRec);
      }
      this.setState({ activeApprovalOriginatorList, activeUsersList });
    } else if (type === userRoles.APPROVER) {
      let activeApprovalApproverList = [];
      //User List to show when clicking on "Add" button
      const activeUsersList = this.state.usersList.slice();

      if (
        Array.isArray(this.state.activeApprovalApproverList) &&
        this.state.activeApprovalApproverList.length
      ) {
        //Approval Setup records, UG Category for the selected(active) Module
        activeApprovalApproverList = this.state.activeApprovalApproverList.slice();
      }
      if (activeUsersList.length > 0) {
        const approverRec = {
          DocEntry: this.state.activeApprovalTemplateId,
          U_UserId: "",
          U_ApprovalLevel: "",
        };
        activeApprovalApproverList.push(approverRec);
      }
      this.setState({ activeApprovalApproverList, activeUsersList });
    }
    // else if(type === "USER_GROUP") {
    // }
  };

  async componentDidMount() {
    console.log("ApprovalTemplates - componentDidMount");
    let activeApprovalTemplate = [];
    this.setState({ isLoading: true });
    try {
      await this.getModulesList();
      const activeUsersList = await this.getUsersList();
      const response = await api.get("/custom/approval-template", {
        params: { userId: localStorage.getItem("InternalKey") },
      });
      console.log("approval-template response: " + JSON.stringify(response));
      if (Array.isArray(response.data) && response.data.length) {
        activeApprovalTemplate = response.data[0];
        this.setState({
          approvalTemplatesList: response.data,
          activeApprovalTemplateId: activeApprovalTemplate.DocEntry,
          activeApprovalTemplate,
          templateName: activeApprovalTemplate.U_Name,
          description: activeApprovalTemplate.U_Description,
          moduleId: activeApprovalTemplate.U_DocumentName,
          terms: activeApprovalTemplate.U_Terms,
          noOfApprovals: activeApprovalTemplate.U_NoOfApprovals,
          multiLevelApproval: activeApprovalTemplate.U_MultiLevelApproval,
          isActive: activeApprovalTemplate.U_Active,
          activeApprovalApproverList: activeApprovalTemplate.Approver,
          activeApprovalOriginatorList: activeApprovalTemplate.Originator,
          activeUsersList,
        });
      }
    } catch (err) {
      if (err.response) this.setState({ warningMsg: JSON.stringify(err.response) });
      else if (err.message) this.setState({ warningMsg: err.message });
      else this.setState({ warningMsg: JSON.stringify(err) });
    } finally {
      this.setState({ isLoading: false });
    }
    //displayMode: "READONLY"
  }

  render() {
    /*console.log(`render - templateName: ${this.state.templateName} | description: ${this.state.description}
    | moduleId:  ${this.state.moduleId} | isActive: ${this.state.isActive} | terms: ${this.state.terms}`);
    console.log("render: "+ JSON.stringify(this.state));
    */
    const { checkUserPermission } = this.context;
    const { approvalTemplatesList, activeApprovalApproverList, activeApprovalOriginatorList } =
      this.state;
    return (
      <>
        <Header />
        {/* Page content */}
        <Container className="mt-3" fluid>
          <Row>
            <Col className="order-xl-1" xl="12">
              <Card className="bg-white shadow">
                <CardHeader>
                  <Row className="align-items-center">
                    {" "}
                    {/** border-bottom */}
                    <Col md="4">
                      <h3 className="mb-1.5"> Manage Approval Templates </h3>
                      <div>
                        {" "}
                        {/**  className="mb-2" */}
                        <i className="fa fa-info-circle text-blue" /> &nbsp;
                        <small>Create, modify Approval Templates</small>
                      </div>
                    </Col>
                    <Col className="text-right" md="5">
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
                      ) : null}
                    </Col>
                    <Col className="text-right" md="2">
                      {this.state.isLoading ? (
                        <Spinner color="primary" className="reload-spinner" />
                      ) : this.state.displayMode === displayModes.VIEW ? (
                        <>
                          {checkUserPermission(portalModules.APPROVAL, permissions.CREATE) && (
                            <Button
                              color="primary"
                              // href="#"
                              //NOTE: this creates prob. when using HashRouter.
                              //Clicking on this logs out the user
                              onClick={() => this.handleCreateEdit(displayModes.CREATE)}
                              size="sm"
                            >
                              Create
                            </Button>
                          )}
                          {checkUserPermission(portalModules.APPROVAL, permissions.WRITE) &&
                            Array.isArray(approvalTemplatesList) &&
                            approvalTemplatesList.length > 0 && (
                              <Button
                                color="primary"
                                // href="#"
                                onClick={() => this.handleCreateEdit(displayModes.EDIT)}
                                size="sm"
                              >
                                Edit
                              </Button>
                            )}
                        </>
                      ) : this.state.displayMode === displayModes.EDIT ? (
                        <>
                          <Button
                            color="primary"
                            // href="#"
                            onClick={() => this.handleSave()}
                            size="sm"
                          >
                            Save
                          </Button>
                          <Button
                            color="danger"
                            // href="#"
                            onClick={(e) => this.handleCancel()}
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : null}
                    </Col>
                    <Col className="text-right mt-2 pt-2" md="1">
                      {/* <FavouriteButton /> */}
                    </Col>
                  </Row>
                </CardHeader>
                <CardBody className="mt--2 mb--3">
                  {" "}
                  {/** shadow */}
                  <Row>
                    <Col sm="6" md="3">
                      <h6 className="heading-small text-muted mb-3">Approval Templates</h6>
                      <Card className="pl-sm-4 pr-sm-4 pt-sm-1 pb-sm-2 mt--1 mb-3 shadow-xl">
                        {" "}
                        {/** text-center */}
                        <Row className="mt-2">
                          <Nav vertical>
                            {Array.isArray(approvalTemplatesList) && approvalTemplatesList.length
                              ? approvalTemplatesList.map((rec, key) => {
                                  return (
                                    <NavItem key={rec.DocEntry}>
                                      <NavLink
                                        // href="#"
                                        style={{
                                          cursor:
                                            this.state.action === displayModes.CREATE
                                              ? "default"
                                              : "pointer",
                                        }}
                                        disabled={
                                          this.state.action === displayModes.CREATE ? true : false
                                        }
                                        active={
                                          this.state.activeApprovalTemplateId == rec.DocEntry
                                            ? true
                                            : false
                                        }
                                        className="py-2 text-md"

                                        //moved the onClick() to <span> so this action will be triggered only
                                        //when "Template Name" is clicked
                                        //onClick={() => this.handleTemplateClick(rec.DocEntry)}
                                      >
                                        {this.state.activeApprovalTemplateId == rec.DocEntry &&
                                        this.state.displayMode === displayModes.EDIT &&
                                        checkUserPermission(
                                          portalModules.APPROVAL,
                                          permissions.CANCEL,
                                        ) ? (
                                          <>
                                            <Popover
                                              placement="top"
                                              target={`template_${rec.DocEntry}_${key}`}
                                              className="popover-warning"
                                              isOpen={this.state.approvalTemplatePopoverOpen}
                                            >
                                              <PopoverBody className="text-center">
                                                <span className="text-gray-dark text-xs mb-2 font-weight-600">
                                                  Are you sure you want to delete?
                                                </span>{" "}
                                                <br />
                                                <Button
                                                  outline
                                                  color="primary"
                                                  // href="#"
                                                  onClick={() =>
                                                    this.handleDelete(userRoles.TEMPLATE)
                                                  }
                                                  size="sm"
                                                >
                                                  Yes
                                                </Button>
                                                <Button
                                                  outline
                                                  color="danger"
                                                  // href="#"
                                                  onClick={() =>
                                                    this.togglePopover(userRoles.TEMPLATE)
                                                  }
                                                  size="sm"
                                                >
                                                  No
                                                </Button>
                                              </PopoverBody>
                                            </Popover>
                                            <Trash2
                                              id={`template_${rec.DocEntry}_${key}`}
                                              size={20}
                                              className="mr-1 pb-1 text-danger"
                                              //onClick={() => this.handleDelete(group.U_GroupId)}
                                              onClick={() => this.togglePopover(userRoles.TEMPLATE)}
                                            />
                                          </>
                                        ) : (
                                          <ChevronsRight
                                            size={20}
                                            className={classnames(
                                              "mr-1 pb-1",
                                              this.state.activeApprovalTemplateId == rec.DocEntry
                                                ? "text-primary"
                                                : "",
                                            )}
                                          />
                                        )}
                                        {/*<i className="ni ni-user-run mr-2" />*/}
                                        <span
                                          onClick={() => this.handleTemplateClick(rec.DocEntry)}
                                          className={classnames(
                                            "mb-1 text-sm font-weight-600",
                                            this.state.activeApprovalTemplateId == rec.DocEntry
                                              ? "text-primary"
                                              : "",
                                          )}
                                        >
                                          {rec.U_Name}
                                        </span>
                                      </NavLink>
                                    </NavItem>
                                  );
                                })
                              : this.state.displayMode === displayModes.VIEW && (
                                  <small className="text-primary">
                                    <i className="fa fa-info-circle" /> &nbsp; No records found!
                                    <br />
                                    <br />
                                    Click on <b>Create</b> to add a new Approval Template
                                  </small>
                                )}
                          </Nav>
                        </Row>
                      </Card>
                    </Col>
                    <Col md="9">
                      <Row>
                        <Col>
                          <h6 className="heading-small text-muted mb-3">Template Details</h6>
                          <Card className="pl-sm-4 pr-sm-4 pt-sm-1 pb-sm-0 mt--1 mb-3 shadow-xl">
                            {" "}
                            {/** text-center */}
                            <Row className="mt-2 pb-3">
                              <Col md="4">
                                <small className="text-muted">Template Name</small>
                                <FormGroup className="mt-1">
                                  <Input
                                    bsSize="sm"
                                    //style={{ width: 70 + "%" }}
                                    value={this.state.templateName}
                                    className={
                                      "form-control display-4 text-gray-dark " +
                                      this.state.invalidInput.templateName
                                    }
                                    id="input-templateName"
                                    placeholder="Enter Template Name"
                                    type="text"
                                    onChange={this.handleFieldChange("templateName")}
                                    disabled={
                                      this.state.displayMode === displayModes.EDIT ? false : true
                                    }
                                  />
                                </FormGroup>
                              </Col>
                              <Col md="4">
                                <small className="text-muted">Description</small>
                                <FormGroup className="mt-1">
                                  <Input
                                    bsSize="sm"
                                    //style={{ width: 70 + "%" }}
                                    value={this.state.description}
                                    className={
                                      "form-control display-4 text-gray-dark " +
                                      this.state.invalidInput.description
                                    }
                                    id="input-description"
                                    placeholder="Enter Description"
                                    type="text"
                                    onChange={this.handleFieldChange("description")}
                                    disabled={
                                      this.state.displayMode === displayModes.EDIT ? false : true
                                    }
                                  />
                                </FormGroup>
                              </Col>
                              {/* <Col md="4">
                            <small className="text-muted">Terms</small>
                            <FormGroup className="mt-1">
                              <Input
                                bsSize="sm"
                                style={{ width: 100 + "%" }}
                                value={this.state.terms}
                                className={"form-control display-4 text-gray-dark " + this.state.invalidInput.terms}
                                id="input-terms"
                                placeholder="Enter Terms"
                                type="email"
                                onChange={this.handleFieldChange("terms")}
                                disabled={this.state.displayMode === displayModes.EDIT ? false : true}
                              />
                            </FormGroup>
                          </Col> */}
                              <Col sm="4">
                                <FormGroup>
                                  <small className="text-muted mb-3">Module Name</small>
                                  <Input
                                    bsSize="sm"
                                    type="select"
                                    value={this.state.moduleId}
                                    style={{ width: "auto" }}
                                    className={
                                      "form-control display-4 text-gray-dark " +
                                      this.state.invalidInput.moduleId
                                    }
                                    onChange={this.handleFieldChange("moduleId")}
                                    disabled={
                                      this.state.displayMode === displayModes.EDIT ? false : true
                                    }
                                  >
                                    <option key={0} value={""}>
                                      Select a Module
                                    </option>
                                    {this.state.modulesList.map((mod) => {
                                      //Exclude User & User Group from the dropdown
                                      if (!nonSAPModules.includes(mod.U_ModuleName)) {
                                        return (
                                          <option key={mod.U_ModuleId} value={mod.U_ModuleId}>
                                            {mod.U_ModuleName}
                                          </option>
                                        );
                                      }
                                    })}
                                  </Input>
                                </FormGroup>
                              </Col>
                              {/* Commenting it temporarily  */}
                              <Col md="4">
                                <small className="text-muted">No. Of Approvals Required</small>
                                <FormGroup className="mt-1">
                                  <Input
                                    bsSize="sm"
                                    style={{ width: 25 + "%" }}
                                    value={this.state.noOfApprovals}
                                    className={
                                      "form-control display-4 text-gray-dark " +
                                      this.state.invalidInput.noOfApprovals
                                    }
                                    id="input-noOfApprovals"
                                    placeholder=""
                                    type="email"
                                    onChange={this.handleFieldChange("noOfApprovals")}
                                    //DISABLE this textbox if Multi-level approval is enabled
                                    //bocz all the Approvers must give their approval in a multi-level setup
                                    disabled={
                                      this.state.displayMode === displayModes.EDIT &&
                                      this.state.multiLevelApproval !== "Y"
                                        ? false
                                        : true
                                    }
                                  />
                                </FormGroup>
                              </Col>
                              {/** Display the checkbox only when the Approver list is > than 1 */}
                              {this.state.multiLevelApproval &&
                                Array.isArray(activeApprovalApproverList) &&
                                activeApprovalApproverList.length > 1 && (
                                  <Col sm="4">
                                    <FormGroup>
                                      <CustomInput
                                        inline
                                        id="multiLevelApproval"
                                        type="checkbox"
                                        label="Multi-level Approval"
                                        className="text-gray-dark display-4 mt-4"
                                        checked={
                                          this.state.multiLevelApproval === "Y" ? true : false
                                        }
                                        onChange={this.handleCheckboxChange("multiLevelApproval")}
                                        disabled={
                                          this.state.displayMode === displayModes.EDIT
                                            ? false
                                            : true
                                        }
                                      />
                                    </FormGroup>
                                  </Col>
                                )}
                              <Col sm="4">
                                <FormGroup>
                                  <CustomInput
                                    inline
                                    id="isActive"
                                    type="checkbox"
                                    label="Active"
                                    className="text-gray-dark display-4 mt-4"
                                    checked={this.state.isActive === "Y" ? true : false}
                                    onChange={this.handleCheckboxChange("isActive")}
                                    disabled={
                                      this.state.displayMode === displayModes.EDIT ? false : true
                                    }
                                  />
                                </FormGroup>
                              </Col>
                            </Row>
                          </Card>
                        </Col>
                      </Row>
                      <Row>
                        <Col>
                          <Row>
                            <Col sm="4">
                              <h6 className="heading-small text-muted mb-3">Approver</h6>
                            </Col>
                            <Col sm="8">
                              {" "}
                              {/*className="text-right"*/}
                              {
                                this.state.displayMode === displayModes.EDIT && (
                                  // <Col className="text-left" md="2">
                                  <Button
                                    outline
                                    className="mb--1 ml--3"
                                    color="primary"
                                    // href="#"
                                    onClick={() => this.addNew(userRoles.APPROVER)}
                                    size="sm"
                                  >
                                    Add
                                  </Button>
                                )
                                // </Col>
                              }
                            </Col>
                          </Row>
                          <Card className="pl-sm-4 pr-sm-4 pt-sm-1 pb-sm-0 mt--1 mb-3 shadow-xl">
                            {" "}
                            {/** text-center */}
                            <Row className="mt-2 pb-3">
                              {
                                //this.state.displayMode === displayModes.EDIT ?
                                /*this.state.action === displayModes.CREATE ?
                              <Col className="text-left" md="2">
                                <Input
                                  bsSize="sm"
                                  type="select"
                                  value={this.state.originatorId}
                                  style={{ width: "auto" }}
                                  className={"form-control text-sm text-gray-dark" + this.state.invalidInput.userId}
                                  onChange={() => this.handleFieldChange("originatorId")}
                                  disabled={this.state.displayMode === displayModes.EDIT ? false: true}
                                >
                                  <option key="-" value="">Select a User</option>
                                  {this.state.usersList.map(user => 
                                    <option key={user.U_UserId} value={user.U_UserId}>
                                      {user.UserName}
                                    </option>
                                  )}
                                </Input>
                              </Col>
                              :*/
                                Array.isArray(activeApprovalApproverList) &&
                                activeApprovalApproverList.length
                                  ? /** NOTE: Previously when I was using below code [DID NOT enclose user,key within () ]
                                     *    activeApprovalApproverList.map(user, key => {..
                                     * I got 'user' undefined error on the browser
                                     */
                                    activeApprovalApproverList.map((user, key) => {
                                      return (
                                        <>
                                          <Col
                                            className="text-left mr--4"
                                            sm="3"
                                            key={user.U_UserId + key}
                                          >
                                            {
                                              //Show the Trash icon only when the Approver list length is Greater than "1"
                                              this.state.displayMode === displayModes.EDIT &&
                                              activeApprovalApproverList.length > 1 ? (
                                                <>
                                                  <Popover
                                                    placement="top"
                                                    target={`approver_${user.U_UserId}_${key}`}
                                                    className="popover-warning"
                                                    isOpen={this.state.approverPopoverOpen[key]}
                                                  >
                                                    <PopoverBody className="text-center">
                                                      <span className="text-gray-dark text-xs mb-2 font-weight-600">
                                                        Are you sure you want to delete?
                                                      </span>{" "}
                                                      <br />
                                                      <Button
                                                        outline
                                                        color="primary"
                                                        // href="#"
                                                        onClick={() =>
                                                          this.handleDelete(userRoles.APPROVER, key)
                                                        }
                                                        size="sm"
                                                      >
                                                        Yes
                                                      </Button>
                                                      <Button
                                                        outline
                                                        color="danger"
                                                        // href="#"
                                                        onClick={() =>
                                                          this.togglePopover(
                                                            userRoles.APPROVER,
                                                            "CLOSE",
                                                            key,
                                                          )
                                                        }
                                                        size="sm"
                                                      >
                                                        No
                                                      </Button>
                                                    </PopoverBody>
                                                  </Popover>
                                                  <Trash2
                                                    id={`approver_${user.U_UserId}_${key}`}
                                                    size={20}
                                                    className="mr-1 pb-1 text-danger"
                                                    onClick={() =>
                                                      this.togglePopover(
                                                        userRoles.APPROVER,
                                                        "OPEN",
                                                        key,
                                                      )
                                                    }
                                                  />
                                                </>
                                              ) : null
                                            }
                                            <Input
                                              bsSize="sm"
                                              type="select"
                                              value={user.U_UserId}
                                              style={{ width: "auto" }}
                                              className={
                                                "form-control display-4 text-gray-dark " +
                                                this.state.invalidInput.approver
                                              } //text-sm
                                              onChange={(event) =>
                                                this.handleListChange(
                                                  userRoles.APPROVER,
                                                  key,
                                                  event,
                                                )
                                              }
                                              disabled={
                                                this.state.displayMode === displayModes.EDIT
                                                  ? false
                                                  : true
                                              }
                                            >
                                              <option key="-" value="">
                                                Select a User
                                              </option>
                                              {this.state.usersList.map((user) => (
                                                <option key={user.U_UserId} value={user.U_UserId}>
                                                  {user.UserName}
                                                </option>
                                              ))}
                                            </Input>
                                          </Col>
                                          {this.state.multiLevelApproval === "Y" ? (
                                            <Col key={user.U_UserId} className="mt-1 ml-0" sm="2">
                                              <span
                                                className={"text-gray-dark text-sm font-weight-600"}
                                              >
                                                Level {user.U_ApprovalLevel}
                                              </span>
                                            </Col>
                                          ) : null}
                                        </>
                                      );
                                    })
                                  : null
                              }
                            </Row>
                          </Card>
                        </Col>
                      </Row>
                      <Row>
                        <Col>
                          <Row>
                            <Col sm="4">
                              <h6 className="heading-small text-muted mb-3">Originators</h6>
                            </Col>
                            <Col sm="8">
                              {" "}
                              {/*className="text-right"*/}
                              {
                                this.state.displayMode === displayModes.EDIT && (
                                  // <Col className="text-left" md="2">
                                  <Button
                                    outline
                                    className="mb--1 ml--3"
                                    color="primary"
                                    // href="#"
                                    onClick={() => this.addNew(userRoles.ORIGINATOR)}
                                    size="sm"
                                  >
                                    Add
                                  </Button>
                                )
                                // </Col>
                              }
                            </Col>
                          </Row>
                          <Card className="pl-sm-4 pr-sm-4 pt-sm-1 pb-sm-0 mt--1 mb-3 shadow-xl">
                            {" "}
                            {/** text-center */}
                            <Row className="mt-2 pb-3">
                              {Array.isArray(activeApprovalOriginatorList) &&
                              activeApprovalOriginatorList.length ? (
                                activeApprovalOriginatorList.map((user, key) => {
                                  return (
                                    <Col className="text-left" sm="3" key={user.U_UserId + key}>
                                      {
                                        //Show the Trash icon only when the Originator list length is Greater than "1"
                                        this.state.displayMode === displayModes.EDIT &&
                                        activeApprovalOriginatorList.length > 1 ? (
                                          <>
                                            <Popover
                                              placement="top"
                                              target={`originator_${user.U_UserId}_${key}`}
                                              className="popover-warning"
                                              isOpen={this.state.originatorPopoverOpen[key]}
                                            >
                                              <PopoverBody className="text-center">
                                                <span className="text-gray-dark text-xs mb-2 font-weight-600">
                                                  Are you sure you want to delete?
                                                </span>{" "}
                                                <br />
                                                <Button
                                                  outline
                                                  color="primary"
                                                  // href="#"
                                                  onClick={() =>
                                                    this.handleDelete(userRoles.ORIGINATOR, key)
                                                  }
                                                  size="sm"
                                                >
                                                  Yes
                                                </Button>
                                                <Button
                                                  outline
                                                  color="danger"
                                                  // href="#"
                                                  onClick={() =>
                                                    this.togglePopover(
                                                      userRoles.ORIGINATOR,
                                                      "CLOSE",
                                                      key,
                                                    )
                                                  }
                                                  size="sm"
                                                >
                                                  No
                                                </Button>
                                              </PopoverBody>
                                            </Popover>
                                            <Trash2
                                              id={`originator_${user.U_UserId}_${key}`}
                                              size={20}
                                              className="mr-1 pb-1 text-danger"
                                              onClick={() =>
                                                this.togglePopover(
                                                  userRoles.ORIGINATOR,
                                                  "OPEN",
                                                  key,
                                                )
                                              }
                                            />
                                          </>
                                        ) : null
                                      }
                                      {
                                        //user.isNew ?
                                        <Input
                                          bsSize="sm"
                                          type="select"
                                          value={user.U_UserId}
                                          style={{ width: "auto" }}
                                          className={
                                            "form-control display-4 text-gray-dark " +
                                            this.state.invalidInput.originator
                                          }
                                          onChange={(event) =>
                                            this.handleListChange(userRoles.ORIGINATOR, key, event)
                                          }
                                          disabled={
                                            this.state.displayMode === displayModes.EDIT
                                              ? false
                                              : true
                                          }
                                        >
                                          <option key="-" value="">
                                            Select a User
                                          </option>
                                          {this.state.activeUsersList.map((user) => (
                                            <option key={user.U_UserId} value={user.U_UserId}>
                                              {user.UserName}
                                            </option>
                                          ))}
                                        </Input>
                                        /*:
                                    <span className="text-sm text-gray-dark">
                                      {user.UserName}
                                    </span>*/
                                      }
                                    </Col>
                                  );
                                })
                              ) : this.state.displayMode === displayModes.VIEW ? (
                                <span className="text-primary mr-20 small">
                                  <i className="fa fa-info-circle" /> &nbsp; No user are curently
                                  added for this module. Click "Edit" to add
                                </span>
                              ) : null}
                            </Row>
                          </Card>
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </>
    );
  }
}

export default ApprovalTemplates;
