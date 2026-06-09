import React from "react";
import cloneDeep from "lodash.clonedeep";
import AutoComplete from "../../components/AutoComplete";
import ToastMessage from "../../components/ToastMessage";
import { getBinsAndItemQtyForWarehouse } from "../../helper/bin-warehouse";
import { statusColors } from "../../config/config";

export default class BinLocationDropdown extends React.PureComponent {
  state = {
    warehouseCode: "",
    binLocation: "",
    binLocationList: [],
    clearSelectedItem: false, //props for <AutoComplete> to remove Item
    isLoading: false,
    warningMsg: "",
  };

  /**
   * Clears the selected Bin from the auto-complete textbox,
   * Invoked when "X" icon is clicked
   */
  resetClearInput = () => {
    this.setState({
      clearSelectedItem: false,
      binLocation: "",
    });
    // this.props.resetClearInput();
    this.props.handleBinChange({ binCode: "" });
  };

  /**
   * Called from AutoComplete component.
   * Sets "binLocation" as NULL when a value is removed from AutoComplete box
   * @param {Event} event parameter passed from AutoComplete comp.
   */
  handleBinReset = (event) => {
    console.log("event.target.value: " + event.target.value);

    if (event.target.value === "") {
      this.setState({ binLocation: "" });
      this.props.handleBinChange({ binCode: "" });
    }
  };

  handleBinChange = async (binLocation) => {
    // let binLocation = event.target.value
    console.log("binLocation: ", binLocation);
    if (binLocation) {
      // this.setState({ binLocation }, async () => await this.getBatchSerialInfo()); //"ITEMS"
      this.setState({ binLocation });
      // this.props.handleBinChange(binLocation);

      let value = { binCode: binLocation };
      //Include BinAbsEntry in the return value if the below prop is 'true'
      if (this.props.returnBinAbsEntry) {
        const selectedBin = this.state.binLocationList.find((bin) => bin.BinCode === binLocation);
        console.log("Selected Bin: ", JSON.stringify(selectedBin));
        value.binAbsEntry = selectedBin.AbsEntry;
      }
      //'rowIndex' sent back when this dropdown is used within a <Table>
      this.props.handleBinChange(value, this.props.rowIndex);
    }
    // else {
    //   this.setState({
    //     binLocation,
    //     // allBatchSerialItemsList: [],
    //     filteredBatchSerialItemsList: cloneDeep(this.state.allBatchSerialItemsList)
    //   })
    // }
  };
  async componentDidUpdate(prevProps, prevState) {
    if (
      this.props.warehouseCode &&
      !prevState.warehouseCode &&
      this.props.warehouseCode !== prevProps.warehouseCode
    ) {
      this.setState({ isLoading: true });
      try {
        const binLocationList = await getBinsAndItemQtyForWarehouse(
          "BINS",
          this.props.warehouseCode,
        );
        //load new set of Bins & clear the currentlt selected 'Bin' from the auto-complete box
        this.setState({
          binLocation: "",
          binLocationList,
        });
        this.props.handleBinChange({ binCode: "", binLocationList });
      } catch (err) {
        this.setState({ isLoading: false, warningMsg: err });
      } finally {
        this.setState({ isLoading: false });
      }
    }
  }

  // async componentDidMount() {
  //   let binLocationList = [];
  //   if(this.props.warehouseCode && this.props.warehouseCode !== this.state.warehouseCode) {
  //     binLocationList = await getBinsAndItemQtyForWarehouse("BINS", this.props.warehouseCode);
  //   }
  //   this.setState({ binLocationList });
  // }

  render() {
    return (
      <>
        {this.props.label && <small className="text-muted">{this.props.label}</small>}
        <AutoComplete
          value={this.state.binLocation}
          suggestions={this.state.binLocationList}
          className={"form-control display-4 text-gray-dark " + this.props.label ? "mt-1" : ""}
          filterKey="BinCode"
          suggestionLimit={8}
          placeholder={this.state.isLoading ? "Loading..." : "Enter Bin Location"}
          //reset "clearInput" props when a Bin is entered
          onSuggestionItemClick={this.handleBinChange}
          onChange={this.handleBinReset}
          clearInput={this.state.clearSelectedItem}
          resetClearInput={this.resetClearInput}
        />

        {this.state.warningMsg && (
          <ToastMessage type={statusColors.WARNING} message={this.state.warningMsg} />
        )}

        {/* <small className="text-muted">{this.props.label}</small> */}
        {/* <Input bsSize="sm"
            id="binLocation"
            type="select"
            name="select"
            className={"form-control display-4 text-gray-dark "
              + this.state.invalidInput.binLocation}
            value={this.state.binLocation}
            //style={{ width: "auto" }} //width: 100
            onChange={this.handleBinChange}
          >
            <option value="">-- Select a Bin --</option>
            {Array.isArray(this.state.binLocationList) && this.state.binLocationList.length > 0
              && this.state.binLocationList.map((bin, key) => {
              return (
                <option
                  key={bin.BinCode}
                  value={bin.BinCode}
                >
                  {bin.BinCode}
                </option>
              )
            })}
          </Input> */}
      </>
    );
  }
}
