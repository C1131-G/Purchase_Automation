import React from "react";
import { Link } from "react-router-dom";
// reactstrap components
import {
  UncontrolledCollapse,
  NavbarBrand,
  Navbar,
  NavItem,
  NavLink,
  Nav,
  Container,
  Row,
  Col,
} from "reactstrap";
import { companyNames } from "../../config/config";

class AdminNavbar extends React.Component {
  render() {
    return (
      <>
        <Navbar className="navbar-top navbar-horizontal navbar-dark" expand="md">
          <Container className="px-4">
            <NavbarBrand to="/" tag={Link}>
              {process.env.REACT_APP_COMPANY_NAME === companyNames.AJAX ? (
                <img alt="..." src={require("assets/img/brand/logos.jpg")} />
              ) : (
                <img alt="..." src={require("assets/img/brand2/logos.jpg")} />
              )}
            </NavbarBrand>
            <UncontrolledCollapse navbar toggler="#navbar-collapse-main">
              <div className="navbar-collapse-header d-md-none">
                <Row>
                  <Col className="collapse-brand" xs="6">
                    {process.env.REACT_APP_COMPANY_NAME === companyNames.AJAX ? (
                      <img
                        alt="..."
                        className="navbar-brand-img"
                        src={require("assets/img/brand/logos.jpg")}
                      />
                    ) : (
                      <img
                        alt="..."
                        className="navbar-brand-img"
                        src={require("assets/img/brand2/logos.jpg")}
                      />
                    )}
                  </Col>
                  <Col className="collapse-close" xs="6">
                    <button className="navbar-toggler" id="navbar-collapse-main">
                      <span />
                    </button>
                  </Col>
                </Row>
              </div>
              {/*<Nav className="ml-auto" navbar>
                <NavItem>
                  <NavLink
                    className="nav-link-icon"
                    to="/u/user-profile"
                    tag={Link}
                  >
                    <i className="ni ni-single-02" />
                    <span className="nav-link-inner--text">Profile</span>
                  </NavLink>
                </NavItem>
              </Nav>*/}
            </UncontrolledCollapse>
          </Container>
        </Navbar>
      </>
    );
  }
}

export default AdminNavbar;
