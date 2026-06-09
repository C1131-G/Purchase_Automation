/*eslint-disable*/
import React from "react";
import { companyName, companyURL } from "../../config/config";

// reactstrap components
import { Container, Row, Col, Nav, NavItem, NavLink } from "reactstrap";

class Footer extends React.Component {
  render() {
    return (
      <>
        <footer>
          <Container>
            <Row className="align-items-center justify-content-xl-between">
              <Col xl="6">
                <div className="copyright text-center text-xl-left text-muted">
                  {/* © {new Date().getFullYear()}{" "} */}
                  <a className="ml-1" href={companyURL} rel="noopener noreferrer" target="_blank">
                    {/* {companyName} */}
                  </a>
                </div>
              </Col>
              <Col xl="6">
                <Nav className="nav-footer justify-content-xl-end">
                  <NavItem>
                    <NavLink href="#" rel="noopener noreferrer" target="_blank">
                      © {new Date().getFullYear()} &emsp;
                      {/* <i className="fa fa-cogs text-orange" /> &nbsp;
                      <small>Powered by &nbsp;</small>TNS */}
                    </NavLink>
                  </NavItem>
                </Nav>
              </Col>
            </Row>
          </Container>
        </footer>
      </>
    );
  }
}

export default Footer;
