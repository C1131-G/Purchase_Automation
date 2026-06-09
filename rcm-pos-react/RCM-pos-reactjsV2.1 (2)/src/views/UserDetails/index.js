import React from "react";
import classnames from "classnames";
// reactstrap components
import {
  Card,
  CardBody,
  NavItem,
  NavLink,
  Nav,
  TabContent,
  TabPane,
  Container,
  Row,
  Col,
  Spinner,
} from "reactstrap";

import Header from "../../components/Headers/Header";
//import UserDetails from "./UserDetails";
const UserDetails = React.lazy(() => import("./UserDetails"));

class Users extends React.Component {
  state = {
    usersTab: 1,
  };

  toggleTabs = (e, selectedTabNo) => {
    e.preventDefault();
    this.setState({ usersTab: selectedTabNo });
  };

  componentDidMount = () => {};

  render() {
    return (
      <>
        <Header />
        {/* Page content */}
        <Container className="mt-3" fluid>
          {/** Tabs */}
          <Row>
            <Col className="order-xl-1" xl="12">
              <Card className="bg-white shadow">
                <CardBody className="mt--3 mb--4 donot-printme">
                  <div className="nav-wrapper">
                    <Nav
                      className="nav-fill flex-column flex-md-row"
                      id="tabs-icons-text"
                      pills
                      role="tablist"
                    >
                      <NavItem>
                        <NavLink
                          aria-selected={this.state.usersTab === 1}
                          className={classnames("mb-sm-3 mb-md-0", {
                            active: this.state.usersTab === 1,
                          })}
                          onClick={(e) => this.toggleTabs(e, 1)}
                          href="#"
                          role="tab"
                        >
                          <i className="fa fa-address-card mr-2" /> {/** fa-server tasks */}
                          POS Users
                        </NavLink>
                      </NavItem>
                      <NavItem>
                        <NavLink
                          aria-selected={this.state.usersTab === 2}
                          className={classnames("mb-sm-3 mb-md-0", {
                            active: this.state.usersTab === 2,
                          })}
                          onClick={(e) => this.toggleTabs(e, 2)}
                          href="#"
                          role="tab"
                          //style={{cursor: this.state.tabCursorStyle[0]}}
                        >
                          <i className="fa fa-address-card mr-2" /> {/** fa-cog rocket */}
                          Non-POS Users
                        </NavLink>
                      </NavItem>
                    </Nav>
                  </div>
                </CardBody>

                {/**<Card className="shadow">
              <CardBody>*/}
                <TabContent activeTab={"usersTab" + this.state.usersTab}>
                  <TabPane tabId="usersTab1">
                    {this.state.usersTab === 1 && (
                      <React.Suspense
                        fallback={
                          <>
                            <i className="fa fa-info-circle text-blue" /> &nbsp;
                            <small className="my-2 text-primary">Loading... &emsp;</small>
                            <Spinner color="primary" className="reload-spinner" />
                          </>
                        }
                      >
                        <UserDetails isPortalUser="Y" />
                      </React.Suspense>
                    )}
                  </TabPane>
                  {/** Tab#2 */}
                  <TabPane tabId="usersTab2">
                    {this.state.usersTab === 2 ? (
                      <React.Suspense
                        fallback={
                          <>
                            <i className="fa fa-info-circle text-blue" /> &nbsp;
                            <small className="my-2 text-primary">Loading... &emsp;</small>
                            <Spinner color="primary" className="reload-spinner" />
                          </>
                        }
                      >
                        <UserDetails isPortalUser="N" />
                      </React.Suspense>
                    ) : null}
                  </TabPane>
                </TabContent>
              </Card>
            </Col>
          </Row>
        </Container>
      </>
    );
  }
}

export default Users;
