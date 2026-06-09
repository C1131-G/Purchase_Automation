import React, { Suspense } from "react";
// node.js library that concatenates classes (strings)
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
} from "reactstrap";

import Header from "../../../components/Headers/Header";
import SaleOrders from "./SaleOrders";

const ItemDetails = React.lazy(() => import("./ItemDetails"));

class CreateDelivery extends React.Component {
  timer = null;
  state = {
    tab: 1,
    tabCursorStyle: ["not-allowed", "not-allowed"], //Cursor style for Tab#2 & #3
    error: "",
    selectedBaseRecords: [],
    warningMsg: "",
    deliveryNumber: "",
  };

  toggleTabs = (e, name, index) => {
    console.log("index: " + index);
    e.preventDefault();
    this.setState({
      [name]: index,
      //itemsList: [],
      //quantityTooltip: [],
      warningMsg: [],
    });
    if (index === 1) {
      this.setState({
        deliveryNumber: "",
        tabCursorStyle: ["not-allowed", "not-allowed"],
        //normalItemsList: [], batchItemsList: [], serialNoItemsList: [], createdBatchList:[], createdSerialNoList: [],
        selectedBaseRecords: [],
      });
    }
  };

  async componentDidMount() {
    console.log("delivery - componentDidMount");
  }

  /** Callback function to be executed from Tab#1 <SaleOrders> component.
   * Passes the selected PO related info from child component <SaleOrders> to the parent component- CreateDelivery.
   * These details will be passed to <ItemDetails> as props.
   * @param {Array} selectedBaseRecords
   */
  setSelectedBaseRecordDetails = (selectedBaseRecords = []) => {
    console.log(`CreateDelivery- selectedBaseRecords: ${JSON.stringify(selectedBaseRecords)}`);

    //To automatically scroll to top of the window when loading Tab#2, in case if user has scrolled down in the prev tab
    window.scrollTo(0, 0);
    this.setState({
      selectedBaseRecords,
      tab: 2, //Open "Submit delivery" tab
      tabCursorStyle: ["default", "not-allowed"], //"none" //Set the cursor style as "default" for Tab that is currently open
    });
  };

  render() {
    //console.log("CreateDelivery - render");
    const {
      selectedBaseRecords,
      normalItemsList,
      createdBatchList,
      createdSerialNoList,
      deliveryNumber,
    } = this.state;
    return (
      <>
        <Header />
        {/* Page content */}
        <Container className="mt-3" fluid>
          {/** Tabs */}
          <Row>
            <Col className="order-xl-1" xl="12">
              <Card className="bg-white shadow">
                {/** <CardHeader className="border-1 mb--4"> {// bg-white}
                <Row className="align-items-center">
                  <Col xs="8">
                    <h3 className="mb-0">delivery Creation Wizard</h3>
                  </Col>
                </Row>
              </CardHeader> */}
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
                          aria-selected={this.state.tab === 1}
                          className={classnames("mb-sm-3 mb-md-0", {
                            active: this.state.tab === 1,
                          })}
                          onClick={(e) => this.toggleTabs(e, "tab", 1)}
                          href="#"
                          role="tab"
                        >
                          <i className="fa fa-list mr-2" /> {/** fa-server tasks */}
                          Sale Orders
                        </NavLink>
                      </NavItem>
                      <NavItem>
                        <NavLink
                          aria-selected={this.state.tab === 2}
                          className={classnames("mb-sm-3 mb-md-0", {
                            active: this.state.tab === 2,
                          })}
                          //Allow users from Navigating directly to Tab#2 from Tab#3
                          /*onClick={this.state.tab === 3 ?
                          e => this.toggleTabs(e, "tab", 2) : undefined
                        }*/
                          href="#"
                          role="tab"
                          style={{ cursor: this.state.tabCursorStyle[0] }}
                        >
                          <i className="fa fa-cloud-upload-alt mr-2" /> {/** fa-cog rocket */}
                          Submit Delivery
                        </NavLink>
                      </NavItem>
                    </Nav>
                  </div>
                </CardBody>

                {/**<Card className="shadow">
              <CardBody>*/}
                <TabContent activeTab={"tab" + this.state.tab}>
                  <TabPane tabId="tab1">
                    <SaleOrders setSelectedBaseRecordDetails={this.setSelectedBaseRecordDetails} />
                  </TabPane>
                  {/** Tab#2 */}
                  <TabPane tabId="tab2">
                    {this.state.tab === 2 ? (
                      <Suspense
                        fallback={
                          <>
                            <i className="fa fa-info-circle text-blue" /> &nbsp;
                            <small className="my-2 text-primary">Loading... &emsp;</small>
                          </>
                        }
                      >
                        <ItemDetails
                          selectedBaseRecords={selectedBaseRecords}
                          toggleTabs={this.toggleTabs}
                        />
                      </Suspense>
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

export default CreateDelivery;
