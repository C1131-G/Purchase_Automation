import React from "react";
import { Input } from "reactstrap";
import ToastMessage from "../../components/ToastMessage";
import api from "../../config/api-nodejs";
import { statusColors } from "../../config/config";

export default class BranchDropdown extends React.PureComponent {
  state = {
    branch: this.props.value,
    branchList: [],
    warningMsg: "",
  };

  handleBranchChange = (event) => {
    const branchId = event.target.value;
    const branchName = event.target.options[event.target.selectedIndex].text;

    this.setState({ branch: branchId });

    //'rowIndex' sent back when this dropdown is used within a <Table>
    this.props.handleChange(branchId, branchName, this.props.rowIndex);
  };

  /**
   * TODO: Need to move this to a 'helper' file adn use it across all the comps.
   * Gets the list of Warehouses/Bin Locations from the resp. APIs and sets them to "state"
   * @param {String} type "Warehouse" or "BinLocation"
   */
  loadDropdownList = async (type, value) => {
    this.setState({ isLoading: true });
    let stateVariable = "";
    let uri, response;
    if (type === "WAREHOUSE") {
      stateVariable = "warehouseList";
      uri = "custom/warehouse";
    } else if (type === "BIN_LOCATION") {
      stateVariable = "binLocationList";
    } else if (type === "Freights") {
      stateVariable = "allFreightList";
      uri = "custom/freights";
    } else if (type === "BRANCH") {
      stateVariable = "branchList";
      uri = "custom/branch";
    }
    try {
      //const response = await axios.get(uri); //added for calling Mock API
      if (type === "WAREHOUSE") {
        response = await api.get(uri, { params: { branchId: value } });
      } else if (type === "BRANCH") {
        response = await api.get(uri, { params: { userId: localStorage.getItem("InternalKey") } });
      } else {
        response = await api.get(uri);
      }
      response = response.data;
      console.log(`Warehouse/Bin List: ${JSON.stringify(response)}`);
      if (Array.isArray(response) && response.length) {
        this.setState({
          [stateVariable]: response,
          isLoading: false,
        });
        if (type === "Freights") {
          this.setState({ freightDropdownList: response });
        }
      }
    } catch (error) {
      this.setState({ warningMsg: error, isLoading: false });
    }
  };

  async componentDidMount() {
    await this.loadDropdownList("BRANCH");
  }

  render() {
    let className = this.props.className ? this.props.className : "";
    return (
      <>
        {/* If the dropdown is used within a <Table> hide the 'label' & remove 'margin' styling */}
        {!this.props.removeLabel && ( //this.props.label ||
          <small className="text-muted">{this.props.label}</small>
        )}
        <div className={!this.props.removeMargin ? "mt-1 mb-3" : ""}>
          <Input
            bsSize="sm"
            id="branch"
            type="select"
            name="select"
            className={"form-control display-4 text-gray-dark "}
            value={this.state.branch}
            style={this.props.style}
            onChange={(e) => this.handleBranchChange(e)}
            // readOnly={this.props.readOnly}
            disabled={this.props.disabled}
          >
            <option value="">
              {this.state.isLoading ? "Loading..." : "-- Select a Branch --"}
            </option>
            {this.state.branchList.map((branch, key) => {
              return (
                <option key={branch.BPLId} value={branch.BPLId}>
                  {branch.BPLName}
                </option>
              );
            })}
          </Input>
        </div>

        {this.state.warningMsg && (
          <ToastMessage type={statusColors.WARNING} message={this.state.warningMsg} />
        )}
      </>
    );
  }
}
