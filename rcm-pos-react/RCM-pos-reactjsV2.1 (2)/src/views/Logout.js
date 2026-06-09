import React from "react";
import axios from "axios";

import { statusColors } from "../config/config.js";
import { UserPermissionsContext } from "../contexts/UserPermissionsContext";
import { deleteSession } from "../helper/session-helper";

axios.defaults.withCredentials = true;

class Logout extends React.Component {
  static contextType = UserPermissionsContext;
  state = {
    message: null,
    error: null,
    isLoading: true,
  };

  async destroySession() {
    console.log("destroySession");
    return await deleteSession();
  }

  async componentDidMount() {
    console.log("logout - didMount");
    this.setState({ isLoading: true });
    // localStorage.clear();
    localStorage.setItem("InternalKey", "");
    localStorage.setItem("UserCode", "");
    localStorage.setItem("UserName", "");
    localStorage.setItem("MobilePhoneNumber", "");
    localStorage.setItem("eMail", "");
    localStorage.setItem("permissions", "");
    localStorage.setItem("loginTime", "");
    try {
      const { setUserPermissions } = this.context;
      //Remove user Permissions from `context`
      setUserPermissions([]);
      await this.destroySession();
    } catch (error) {
      this.setState({
        error: { message: error },
        isLoading: false,
      });
    }
    this.props.history.push({
      pathname: "/g/login",
      state: { message: "Logged out successfully!", type: statusColors.SUCCESS },
    });
  }

  render() {
    var { isLoading, error } = this.state;
    return (
      <div>
        {isLoading ? <h4>Logging out...</h4> : null}
        {error ? <div>{error.message.toString()}</div> : null}
      </div>
    );
  }
}

export default Logout;
