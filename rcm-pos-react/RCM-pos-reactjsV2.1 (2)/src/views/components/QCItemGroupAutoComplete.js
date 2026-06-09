import React from "react";
import AutoComplete from "../../components/AutoComplete";
import ToastMessage from "../../components/ToastMessage";
import { statusColors } from "../../config/config";

import { getQCItemGroup } from "../../helper/qc-item-group";

export default class QCItemGroupAutoComplete extends React.PureComponent {
  state = {
    itemGroupName: "",
    itemGroupList: [],
    clearSelection: false, //props for <AutoComplete> to remove Item
  };

  /**
   * Clears the selected value from the auto-complete textbox,
   * Invoked when "X" icon is clicked
   */
  resetClearInput = () => {
    this.setState({
      clearSelection: false,
      itemGroupName: "",
    });
    // this.props.resetClearInput();
    this.props.handleValueChange("");
  };

  /**
   * Called from AutoComplete component.
   * Sets "itemGroupName" as NULL when a value is removed from AutoComplete box
   * @param {Event} event parameter passed from AutoComplete comp.
   */
  handleReset = (event) => {
    console.log("event.target.value: " + event.target.value);

    if (event.target.value === "") {
      this.setState({ itemGroupName: "" });
      this.props.handleValueChange("");
    }
  };

  handleValueChange = async (itemGroupName) => {
    if (itemGroupName) {
      this.setState({ itemGroupName });
      this.props.handleValueChange(itemGroupName, this.state.itemGroupList);
    }
  };

  async componentDidUpdate(prevProps, prevState) {
    console.log("QCImteCompleteAutoComplete - DidUpdate");
    console.log("this.props.itemGroupName: ", this.props.itemGroupName);

    //Clear the value in the <AutoComplete> comp. when itemGroupName prop is null or blank
    if (this.props.clearSelection) {
      // && this.props.clearSelection !== prevProps.clearSelection
      // if(!this.props.itemGroupName && this.props.itemGroupName !== prevProps.itemGroupName) {
      this.setState({ clearSelection: true });
    } else {
      if (this.props.itemGroupName !== prevState.itemGroupName) {
        //&& this.props.itemGroupName !== prevState.itemGroupName
        if (this.props.itemGroupName) {
          this.setState({ itemGroupName: this.props.itemGroupName });
          // this.props.handleValueChange(this.props.itemGroupName, this.state.itemGroupList);
        } else {
          this.setState({ clearSelection: true });
        }
      }
    }
    // this.setState({ isLoading: true });
    // try {
    //   const itemGroupList = await getQCItemGroup();
    //   this.props.handleValueChange("", itemGroupList);
    // }
    // catch (err) {
    //   this.setState({ warningMsg: "Error loading Item Groups", isLoading: false });
    //   console.error("Error loading Item Group list: %s", JSON.stringify(err));
    // }
    // finally {
    //   this.setState({ isLoading: false });
    // }
  }

  async componentDidMount() {
    this.setState({ isLoading: true });
    let itemGroupName = "";
    if (this.props.itemGroupName) {
      itemGroupName = this.props.itemGroupName;
    }
    try {
      const itemGroupList = await getQCItemGroup();
      this.setState({ itemGroupName, itemGroupList });
      this.props.handleValueChange(itemGroupName, itemGroupList);
    } catch (err) {
      this.setState({ warningMsg: "Error loading Item Groups", isLoading: false });
      console.error("Error loading Item Group list: %s", JSON.stringify(err));
    } finally {
      this.setState({ isLoading: false });
    }
  }

  render() {
    return (
      <>
        {this.props.label ? <small className="text-muted">{this.props.label}</small> : null}
        <AutoComplete
          value={this.state.itemGroupName}
          suggestions={this.state.itemGroupList}
          className="form-control display-4 text-gray-dark"
          filterKey="groupName"
          suggestionLimit={8}
          placeholder={this.state.isLoading ? "Loading..." : "Enter a Item Group"}
          //reset "clearInput" props when a value is entered
          onSuggestionItemClick={this.handleValueChange}
          onChange={this.handleReset}
          clearInput={this.state.clearSelection}
          resetClearInput={this.resetClearInput}
        />

        {this.state.warningMsg && (
          <ToastMessage type={statusColors.WARNING} message={this.state.warningMsg} />
        )}
      </>
    );
  }
}
