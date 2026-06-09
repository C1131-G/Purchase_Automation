import React from "react";
import AutoComplete from "../../components/AutoComplete";
import { getCustomerInfo } from "../../helper/customer";

export default class CustomerDropdown extends React.PureComponent {
  state = {
    selectedCustomer: "",
    customerList: [],
    clearSelectedItem: false, //props for <AutoComplete> to remove Item
  };

  /**
   * Clears the selected value from the auto-complete textbox,
   * Invoked when "X" icon is clicked
   */
  resetClearInput = () => {
    this.setState({
      clearSelectedItem: false,
      selectedCustomer: "",
    });
    // this.props.resetClearInput();
    this.props.handleValueChange("");
  };

  /**
   * Called from AutoComplete component.
   * Sets "selectedCustomer" as NULL when a value is removed from AutoComplete box
   * @param {Event} event parameter passed from AutoComplete comp.
   */
  handleReset = (event) => {
    console.log("event.target.value: " + event.target.value);

    if (event.target.value === "") {
      this.setState({ selectedCustomer: "" });
      this.props.handleValueChange("");
    }
  };

  handleValueChange = async (selectedCustomer) => {
    // let selectedCustomer = event.target.value
    if (selectedCustomer) {
      // this.setState({ selectedCustomer }, async () => await this.getBatchSerialInfo()); //"ITEMS"
      this.setState({ selectedCustomer });
      this.props.handleValueChange(selectedCustomer);
    }
    // else {
    //   this.setState({
    //     selectedCustomer,
    //     // allBatchSerialItemsList: [],
    //     filteredBatchSerialItemsList: cloneDeep(this.state.allBatchSerialItemsList)
    //   })
    // }
  };
  async componentDidUpdate(prevProps, prevState) {
    const customerList = await getCustomerInfo();
    this.props.handleValueChange("", customerList);
  }

  async componentDidMount() {
    let selectedCustomer = "";
    if (this.props.selectedCustomer) {
      selectedCustomer = this.props.selectedCustomer;
    }
    try {
      const customerList = await getCustomerInfo();
      this.setState({ selectedCustomer, customerList });
      this.props.handleValueChange("", customerList);
    } catch (err) {
      console.error("Error loading Customer list: %s", JSON.stringify(err));
    }
  }

  render() {
    return (
      <>
        <small className="text-muted">{this.props.label ? this.props.label : ""}</small>
        <AutoComplete
          value={this.state.selectedCustomer}
          suggestions={this.state.customerList}
          className="form-control display-4 text-gray-dark"
          filterKey="CardName"
          suggestionLimit={8}
          placeholder="Select a customer"
          //reset "clearInput" props when a value is entered
          onSuggestionItemClick={this.handleValueChange}
          onChange={this.handleReset}
          clearInput={this.state.clearSelectedItem}
          resetClearInput={this.resetClearInput}
        />
      </>
    );
  }
}
