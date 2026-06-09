/*eslint-disable*/
import React from "react";
import { companyName, companyURL } from "../../config/config";

// reactstrap components
import { Container, Row, Col, Nav, NavItem, NavLink } from "reactstrap";

class Footer extends React.Component {
  render() {
    return (
      <footer className="py-4 mt-1 footer">
        <Row className="align-items-center justify-content-xl-between">
          <Col xl="6">
            <div className="copyright text-center text-xl-left text-muted">
              © {new Date().getFullYear()} &nbsp;
              <a
                className="font-weight-bold ml-1 mb-2"
                href={companyURL}
                rel="noopener noreferrer"
                target="_blank"
              >
                {companyName}
              </a>
            </div>
          </Col>

          <Col xl="6">
            <Nav className="nav-footer justify-content-xl-end">
              <NavItem>
                <NavLink href="#" rel="noopener noreferrer" target="_blank">
                  {/* <i className="fa fa-cogs text-orange" /> &nbsp;
                  <small>Powered by &nbsp;</small>TNS */}
                </NavLink>
              </NavItem>
            </Nav>
          </Col>
        </Row>
      </footer>
    );
  }
}

export default Footer;
