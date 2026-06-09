import React from "react";
import { Toast, ToastBody, ToastHeader } from "reactstrap";
import { statusColors } from "../config/config";
import { toPascalCase } from "../config/util";

export default class ToastMessage extends React.PureComponent {
  state = {
    message: this.props.message,
  };

  closeToast = () => {
    this.setState({ message: "" });
  };

  render() {
    let icon = "fa-info-circle";
    let color = this.props.type;
    let position = "bottom-right";
    let title = toPascalCase(this.props.type);

    if (this.props.type === statusColors.WARNING) {
      icon = "fa-exclamation-triangle";
    } else if (this.props.type === statusColors.INFO) {
      color = "primary";
      position = "center-left";
    }

    return (
      <Toast className={"toast " + position} isOpen={this.state.message ? true : false}>
        <div className={"text-white toast-header toast-" + color}>
          <strong className="mr-auto ">
            <i className={`fa ${icon}`} /> &nbsp;{title}
          </strong>
          <button
            type="button"
            className="ml-2 close"
            data-dismiss="toast"
            aria-label="Close"
            onClick={this.closeToast}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <ToastBody className="text-white text-left toast-body">
          <span
            className={"mr-10 text-" + color}
            dangerouslySetInnerHTML={{ __html: this.state.message }}
          />
        </ToastBody>
      </Toast>
    );
  }
}
