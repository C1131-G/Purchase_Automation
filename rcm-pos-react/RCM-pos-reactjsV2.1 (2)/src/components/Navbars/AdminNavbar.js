import React from "react";
import { Link } from "react-router-dom";
// reactstrap components
import {
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  DropdownToggle,
  Navbar,
  Nav,
  Container,
  Media,
} from "reactstrap";
import { AlignJustify, AlignLeft, Maximize, Minimize } from "react-feather";
import FavouritesDropdown from "./FavouritesDropdown";

class AdminNavbar extends React.Component {
  state = {
    isSideMenuOpen: true,
    isFullScreenEnabled: false,
  };

  toggleFullScreenIcons = () => {
    this.setState((state) => ({ isFullScreenEnabled: !state.isFullScreenEnabled }));
  };

  /**
   * Displays the page in fullscreen
   */
  openFullScreen = () => {
    // Get the documentElement (<html>)
    let elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      /* Safari */
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      /* IE11 */
      elem.msRequestFullscreen();
    }

    //this will be taken care in "fullscreenchange" event listener
    // this.setState({ isFullScreenEnabled: true });
  };

  /**
   * Close fullscreen
   */
  closeFullScreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      /* Safari */
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      /* IE11 */
      document.msExitFullscreen();
    }
    // this.setState({ isFullScreenEnabled: false });
  };

  toggleSidemenu = () => {
    if (localStorage.getItem("isMenuOpen") === "true") {
      this.setState({ isSideMenuOpen: false });

      //TODO: Can create a class with below styles and append it dynamically based on the localStorage value.
      //Ref. link - https://jsfiddle.net/davidg707/cc96ku6t/1/
      document.getElementById("sidenav-main").style.width = "0";
      document.getElementById("main").style.marginLeft = "0";
      localStorage.setItem("isMenuOpen", "false");
    } else {
      this.setState({ isSideMenuOpen: true });

      document.getElementById("sidenav-main").style.width = "210px";
      document.getElementById("main").style.marginLeft = "210px";
      localStorage.setItem("isMenuOpen", "true");
    }
  };

  handleFullScreenChange = () => {
    this.toggleFullScreenIcons();
  };
  /*
  handleEscape = event => {
    const key = event.key;
    if(key === "Escape") {
      this.setState({ isFullScreenEnabled: false });
    }
  } */

  componentWillUnmount() {
    // document.removeEventListener("keydown", this.handleEscape);

    document.removeEventListener("fullscreenchange", this.handleFullScreenChange); //Chrome
    document.removeEventListener("webkitfullscreenchange", this.handleFullScreenChange); //Safair
    document.removeEventListener("mozfullscreenchange", this.handleFullScreenChange); //Mozilla
    document.removeEventListener("MSFullscreenChange", this.handleFullScreenChange); //IE
  }
  componentDidMount = () => {
    console.log("AdminNavbar - componentDidMount");
    localStorage.setItem("isMenuOpen", "true");

    //when Esc key is pressed Fullscreen will be closed automatically,
    //but to change the Maximize icon the below state value must be changed
    // document.addEventListener("keydown", this.handleEscape);

    //NOTE: The above code DIDN'T work as Chrome does not fire a key event when using ESC to leave fullscreen
    //However, a fullscreenchange event is fired
    document.addEventListener("fullscreenchange", this.handleFullScreenChange); //Chrome
    document.addEventListener("webkitfullscreenchange", this.handleFullScreenChange); //Safair
    document.addEventListener("mozfullscreenchange", this.handleFullScreenChange); //Mozilla
    document.addEventListener("MSFullscreenChange", this.handleFullScreenChange); //IE
  };

  render() {
    return (
      <>
        <Navbar className="navbar-top navbar-dark" expand="md" id="navbar-main">
          <Container fluid>
            <div>
              {/** Added for Collapsible Sidemenu */}
              {this.state.isSideMenuOpen ? (
                <AlignLeft size={22} className="toggle-menu-btn" onClick={this.toggleSidemenu} />
              ) : (
                <AlignJustify size={22} className="toggle-menu-btn" onClick={this.toggleSidemenu} />
              )}
              {!this.state.isFullScreenEnabled ? (
                <Maximize
                  size={18}
                  color="white"
                  className="cursor-pointer ml-3"
                  onClick={this.openFullScreen}
                />
              ) : (
                <Minimize
                  size={18}
                  color="white"
                  className="cursor-pointer ml-3"
                  onClick={this.closeFullScreen}
                />
              )}
              <Link
                className="h4 mb-0 ml-3 text-white text-uppercase d-none d-lg-inline-block"
                to="#"
              >
                {this.props.brandText}
              </Link>
            </div>
            {/* Hiding Search bar in the header
            <Form className="navbar-search navbar-search-dark form-inline mr-3 d-none d-md-flex ml-lg-auto">
              <FormGroup className="mb-0">
                <InputGroup className="input-group-alternative">
                  <InputGroupAddon addonType="prepend">
                    <InputGroupText>
                      <i className="fas fa-search" />
                    </InputGroupText>
                  </InputGroupAddon>
                  <Input placeholder="Search" type="text" />
                </InputGroup>
              </FormGroup>
            </Form>*/}

            {/* <FavouritesDropdown /> */}

            <Nav className="align-items-center d-none d-md-flex" navbar>
              <UncontrolledDropdown nav>
                <DropdownToggle className="pr-0" nav>
                  <Media className="align-items-center">
                    {/* <span className="avatar avatar-lg rounded-circle mt--2">
                      <img
                        alt="..."
                        src={require("assets/img/brand/logo.png")}
                      />
                    </span> */}
                    <Media className="ml-2 d-none d-lg-block">
                      <span className="mb-0 text-sm font-weight-bold">
                        {localStorage.getItem("UserName")}
                      </span>
                    </Media>
                  </Media>
                </DropdownToggle>
                <DropdownMenu className="dropdown-menu-arrow" right>
                  <DropdownItem className="noti-title" header tag="div">
                    <h6 className="text-overflow m-0">Welcome!</h6>
                  </DropdownItem>
                  <DropdownItem to="/u/user-profile" tag={Link}>
                    <i className="ni ni-single-02" />
                    <span>My Profile</span>
                  </DropdownItem>
                  <DropdownItem divider />
                  <DropdownItem to="/g/logout" tag={Link}>
                    <i className="ni ni-user-run" />
                    <span>Logout</span>
                  </DropdownItem>
                </DropdownMenu>
              </UncontrolledDropdown>
            </Nav>
          </Container>
        </Navbar>
      </>
    );
  }
}

export default AdminNavbar;
