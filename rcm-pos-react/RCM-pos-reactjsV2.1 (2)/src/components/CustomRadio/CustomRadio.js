import React from "react";
import classnames from "classnames";

class CustomRadio extends React.Component {
  render() {
    return (
      <div
        className={classnames(`tn-radio-con ${this.props.className} tn-radio-${this.props.color}`)}
      >
        <input
          type="radio"
          defaultChecked={this.props.defaultChecked}
          value={this.props.value}
          disabled={this.props.disabled}
          name={this.props.name}
          onClick={this.props.onClick}
          onChange={this.props.onChange}
          ref={this.props.ref}
          checked={this.props.checked}
        />
        <span
          className={classnames("tn-radio", {
            "tn-radio-sm": this.props.size === "sm",
            "tn-radio-lg": this.props.size === "lg",
          })}
        >
          <span className="tn-radio--border" />
          <span className="tn-radio--circle" />
        </span>
        <span>{this.props.label}</span>
      </div>
    );
  }
}
export default CustomRadio;
