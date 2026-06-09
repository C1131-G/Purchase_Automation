import React from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import classnames from "classnames";
import { history } from "../../history";
import PerfectScrollbar from "react-perfect-scrollbar";
import { FormGroup, Input } from "reactstrap";
import { AlertTriangle, X } from "react-feather";

/*NOTE: Made this a PureComponent to stop componentDidUpdate() getting called when I clicked somewhere on the screen
 * React.PureComponent implicitly implements shouldComponentUpdate() with a shallow prop and state comparison.
 *
 * React.PureComponent’s shouldComponentUpdate() skips prop updates for the whole component subtree.
 * Make sure all the children components are also “pure”.
 */
class Autocomplete extends React.PureComponent {
  //React.Component
  state = {
    activeSuggestion: 0,
    showSuggestions: false,
    userInput: "", //this.props.value ? this.props.value : "", //DIDN'T Work. Added code in componentDidUpdate() & it worked
    defaultValue: "",
    focused: false,
    openUp: false,
  };

  filteredData = [];
  // document.body.addEventListener("click", this.handleExtenalClick)

  onSuggestionItemClick = (url, value) => {
    if (this.props.onSuggestionItemClick) {
      this.props.onSuggestionItemClick(value);
    }
    this.setState({
      activeSuggestion: 0,
      showSuggestions: false,
      userInput: value,
    });
    if (url) history.push(url);
  };

  // Suggestion Hover Event
  onSuggestionItemHover = (index) => {
    this.setState({ activeSuggestion: index });
  };

  // Input Change
  onChange = (e) => {
    const userInput = e.currentTarget.value;
    this.setState({
      activeSuggestion: 0,
      showSuggestions: true,
      userInput,
    });
    if (e.target.value < 1) {
      this.setState({
        showSuggestions: false,
      });
    }
  };

  // Input Click Event
  onInputClick = (e) => {
    e.stopPropagation();
  };

  // Input's Keydown Event
  onKeyDown = (e) => {
    const { activeSuggestion, showSuggestions, userInput } = this.state;
    const filterKey = this.props.filterKey;
    let suggestionList = ReactDOM.findDOMNode(this.suggestionList);

    // User pressed the up arrow
    if (e.keyCode === 38 && activeSuggestion !== 0) {
      this.setState({ activeSuggestion: activeSuggestion - 1 });
      if (
        e.target.value.length > -1 &&
        suggestionList !== null &&
        activeSuggestion <= this.filteredData.length / 2
      ) {
        suggestionList.scrollTop = 0;
      }
    }

    // User pressed the down arrow
    else if (e.keyCode === 40 && activeSuggestion < this.filteredData.length - 1) {
      this.setState({ activeSuggestion: activeSuggestion + 1 });

      if (
        e.target.value.length > -1 &&
        suggestionList !== null &&
        activeSuggestion >= this.filteredData.length / 2
      ) {
        suggestionList.scrollTop = suggestionList.scrollHeight;
      }
    }

    //When Backspace is pressed
    /*
    else if (e.keyCode === 8) {
      console.log("Backspace pressed");
      this.setState({
        userInput: ""
      })
    }*/
    // User Pressed ESC
    else if (e.keyCode === 27) {
      this.setState({
        showSuggestions: false,
        userInput: "",
      });
    }

    // User Pressed ENTER
    else if (e.keyCode === 13 && showSuggestions) {
      //console.log("AutoComplete e: "+e.currentTarget.innerText);
      //console.log("this.filteredData: "+ this.filteredData.length);
      /** To fix the error thrown on KenReport screen when user types an invalid Customer Name & presses Enter */
      if (Array.isArray(this.filteredData) && this.filteredData.length) {
        this.setState({
          userInput: this.filteredData[activeSuggestion][filterKey],
          showSuggestions: false,
        });
        this.onSuggestionItemClick(
          this.filteredData[activeSuggestion].link,
          this.filteredData[activeSuggestion][filterKey],
        );
      } else return;
    } else {
      return;
    }

    // Custom Keydown Event
    if (
      this.props.onKeyDown !== undefined &&
      this.props.onKeyDown !== null &&
      this.props.onKeyDown
    ) {
      this.props.onKeyDown(e, userInput);
    }
  };

  // Grouped Suggestions
  renderGroupedSuggestion = (arr) => {
    const { filterKey, customRender } = this.props;
    const {
      onSuggestionItemClick,
      onSuggestionItemHover,
      state: { activeSuggestion, userInput },
    } = this;

    let renderSuggestion = (item, i) => {
      if (!customRender) {
        return (
          <li
            className={classnames("suggestion-item", {
              active: this.filteredData.indexOf(item) === activeSuggestion,
            })}
            key={item[filterKey]}
            onClick={(e) => onSuggestionItemClick(item.link, e.currentTarget.innerText)}
            onMouseEnter={() => {
              this.onSuggestionItemHover(this.filteredData.indexOf(item));
            }}
          >
            {item[filterKey]}
          </li>
        );
      } else if (customRender) {
        return customRender(
          item,
          i,
          this.filteredData,
          activeSuggestion,
          onSuggestionItemClick,
          onSuggestionItemHover,
          userInput,
        );
      } else {
        return null;
      }
    };

    return arr.map((item, i) => {
      return renderSuggestion(item, i);
    });
  };

  // Ungrouped Suggestions
  renderUngroupedSuggestions = () => {
    const { filterKey, suggestions, customRender, suggestionLimit } = this.props;
    const {
      onSuggestionItemClick,
      onSuggestionItemHover,
      state: { activeSuggestion, userInput },
    } = this;

    try {
      this.filteredData = [];
      let sortSingleData = suggestions
        .filter((i) => {
          let startCondition = i[filterKey].toLowerCase().startsWith(userInput.toLowerCase()),
            includeCondition = i[filterKey].toLowerCase().includes(userInput.toLowerCase());
          if (startCondition) {
            return startCondition;
          } else if (!startCondition && includeCondition) {
            return includeCondition;
          } else {
            return null;
          }
        })
        .slice(0, suggestionLimit);
      this.filteredData.push(...sortSingleData);
      return sortSingleData.map((suggestion, index) => {
        if (!customRender) {
          return (
            <li
              className={classnames("suggestion-item", {
                active: this.filteredData.indexOf(suggestion) === activeSuggestion,
              })}
              key={suggestion[filterKey]}
              onClick={(e) =>
                onSuggestionItemClick(
                  suggestion.link ? suggestion.link : null,
                  e.currentTarget.innerText,
                )
              }
              onMouseEnter={() => this.onSuggestionItemHover(this.filteredData.indexOf(suggestion))}
            >
              {suggestion[filterKey]}
            </li>
          );
        } else if (customRender) {
          return customRender(
            suggestion,
            index,
            this.filteredData,
            activeSuggestion,
            onSuggestionItemClick,
            onSuggestionItemHover,
            userInput,
          );
        } else {
          return null;
        }
      });
    } catch (error) {
      throw new Error(error);
    }
  };

  // Renders Suggestions
  renderSuggestions = () => {
    const { filterKey, grouped, filterHeaderKey, suggestions } = this.props;
    const {
      renderUngroupedSuggestions,
      state: { userInput },
    } = this;

    // Checks if suggestions are grouped or not.
    if (grouped === undefined || grouped === null || !grouped) {
      return renderUngroupedSuggestions();
    } else {
      this.filteredData = [];
      return suggestions.map((suggestion) => {
        let sortData = suggestion.data
          .filter((i) => {
            let startCondition = i[filterKey].toLowerCase().startsWith(userInput.toLowerCase()),
              includeCondition = i[filterKey].toLowerCase().includes(userInput.toLowerCase());
            if (startCondition) {
              return startCondition;
            } else if (!startCondition && includeCondition) {
              return includeCondition;
            } else {
              return null;
            }
          })
          .slice(0, suggestion.searchLimit);

        this.filteredData.push(...sortData);
        return (
          <React.Fragment key={suggestion[filterHeaderKey]}>
            <li className="suggestion-item suggestion-title text-primary text-bold-600">
              {suggestion[filterHeaderKey]}
            </li>
            {sortData.length ? (
              this.renderGroupedSuggestion(sortData)
            ) : (
              <li className="suggestion-item no-result">
                <AlertTriangle size={15} /> <span className="align-middle ml-50">No Result</span>
              </li>
            )}
          </React.Fragment>
        );
      });
    }
  };

  // Clears Input
  clearInput = () => {
    //if (this.props.clearInput) {
    this.setState({
      userInput: "",
    });
    this.props.resetClearInput();
    //}
  };

  // Closes Suggestions if clicked outside container (On Blur Basically)
  handleExtenalClick = (e) => {
    let { container } = this.refs;
    const { target } = e;
    if (target !== container && !container.contains(target)) {
      this.setState({
        showSuggestions: false,
      });
      if (this.props.externalClick) this.props.externalClick(e);
    }
  };

  /** Compare "next" state, props with "current" state, props, if they are same then below methods
   * will not be invoked
   *    componentWillUpdate(), render()and componentDidUpdate()
   * Added to prevent unnecessary call to componentDidUpdate() when clicking somewhere on the web page
   */
  /* zz DID NOT work. still componentDidUpdate() is called each time I click on the web page
  shouldComponentUpdate(nextProps, nextState) {
    if (this.props === nextProps && this.state === nextState)
      return false;
    return true;
  }*/

  componentDidUpdate(prevProps, prevState) {
    let textInput = ReactDOM.findDOMNode(this.input);
    let { autoFocus, onSuggestionsShown, clearInput } = this.props;
    // For searchbar focus
    if (textInput !== null && autoFocus) {
      textInput.focus();
    }

    if (
      this.props.defaultSuggestions &&
      prevState.showSuggestions === false &&
      this.state.focused
    ) {
      this.setState({ showSuggestions: true });
    }

    //Added to set a value to AutoComplete textbox when it is sent from parent component
    // console.log("AutoComplete this.props.value: "+this.props.value);
    if (this.props.value !== prevProps.value && this.props.value !== prevState.userInput) {
      this.setState({ userInput: this.props.value });
    }

    // console.log("AutoComplete this.props.defaultValue: "+this.props.defaultValue);
    // console.log("prevState.defaultValue: "+ prevState.defaultValue);
    if (this.props.defaultValue !== null && this.props.defaultValue !== prevState.defaultValue) {
      //this.props.value.indexOf(prevState.userInput
      this.setState({ defaultValue: this.props.defaultValue });
      //,() => console.log("this.state.defaultValue: "+this.state.defaultValue)) //to check if the value is set in the state
    }

    // console.log("AutoComplete compDidUpdate clearInput: "+clearInput);
    // Clear Input
    if (clearInput === true && this.state.userInput.length) {
      this.setState({
        userInput: "",
      });
      //to reset clearInput as "false"
      this.props.resetClearInput();
    }

    /*2.This was called multiple times (around 50 & page crashed) as CallId will be null on Ken Report page's initial load
    console.log("AutoComplete compDidUpdate: "+this.props.value);
    if(this.props.value === "REMOVE")
      this.setState({userInput: ""})
    */

    // Function on Suggestions Shown
    if (onSuggestionsShown && this.state.showSuggestions) {
      onSuggestionsShown(this.state.userInput);
    }

    if (
      this.props.defaultSuggestions &&
      prevState.focused === false &&
      this.state.focused === true
    ) {
      this.setState({ showSuggestions: true });
    }
  }

  componentDidMount() {
    document.body.addEventListener("click", this.handleExtenalClick);

    //console.log("AutoComplete - this.props.value: "+ this.props.value);
    if (this.props.defaultSuggestions && this.state.focused) {
      this.setState({ showSuggestions: true });
    }
    /* 1. This was just called once when the page initially loaded. No use. Add this to CompDidUpdate & test
    console.log("AutoComplete compDidUpdate: "+this.props.value);
    if(this.props.value === "REMOVE")
      this.setState({userInput: ""})
    */
  }

  componentWillUnmount() {
    document.body.removeEventListener("click", this.handleExtenalClick);
  }

  render() {
    const {
      onChange,
      onKeyDown,
      state: { showSuggestions, userInput, defaultValue, openUp },
    } = this;
    let suggestionsListComponent;

    if (showSuggestions) {
      suggestionsListComponent = (
        <PerfectScrollbar
          className={classnames("suggestions-list", {
            "open-up": openUp,
          })}
          ref={(el) => (this.suggestionList = el)}
          component="ul"
          options={{ wheelPropagation: false }}
        >
          {this.renderSuggestions()}
        </PerfectScrollbar>
      );
    }

    return (
      <div className="autocomplete-container" ref="container">
        <Input
          bsSize="sm"
          type="text"
          onChange={(e) => {
            onChange(e);
            if (this.props.onChange) {
              this.props.onChange(e);
            }
          }}
          onKeyDown={(e) => onKeyDown(e)}
          defaultValue={defaultValue}
          value={userInput == "-" ? defaultValue : userInput}
          className={`autocomplete-search ${this.props.className ? this.props.className : ""}`}
          placeholder={this.props.placeholder}
          onClick={this.onInputClick}
          ref={(el) => {
            return (this.input = el);
          }}
          onFocus={(e) => {
            this.setState({ focused: true });
          }}
          autoFocus={this.props.autoFocus}
          onBlur={(e) => {
            // this.onBlur(e)
            if (this.props.onBlur) this.props.onBlur(e);
            this.setState({ focused: false });
          }}
        />
        {this.state.userInput && (
          <div className="form-control-position cursor-pointer">
            <X size={17} className="text-danger" onClick={this.clearInput} />
          </div>
        )}
        {suggestionsListComponent}
      </div>
    );
  }
}

export default Autocomplete;

Autocomplete.propTypes = {
  suggestions: PropTypes.array.isRequired,
  filterKey: PropTypes.string.isRequired,
  filterHeaderKey: PropTypes.string,
  placeholder: PropTypes.string,
  suggestionLimit: PropTypes.number,
  grouped: PropTypes.bool,
  autoFocus: PropTypes.bool,
  onKeyDown: PropTypes.func,
  onChange: PropTypes.func,
  onSuggestionsShown: PropTypes.func,
  onSuggestionItemClick: PropTypes.func,
};
