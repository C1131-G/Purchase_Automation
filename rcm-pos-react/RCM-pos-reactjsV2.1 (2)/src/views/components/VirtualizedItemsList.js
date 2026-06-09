import React from "react";
import classnames from "classnames";
import {
  Button,
  Card,
  FormGroup,
  Input,
  InputGroupAddon,
  InputGroupText,
  Row,
  Col,
  Modal,
  Table,
  Spinner,
  InputGroup,
} from "reactstrap";
import { PlusSquare } from "react-feather";
import InfiniteScroll from "react-infinite-scroll-component";

import api from "../../config/api-nodejs";
import { getItemsInBin } from "../../helper/bin-warehouse";
// import filterItems from "./util";

class VirtualizedItemsList extends React.PureComponent {
  state = {
    isLoading: false,
    warningMsg: "",
    pageNum: 1,
    itemsList: [],
    hasMore: true,
    itemListPopup: this.props.itemListPopup,
    searchKey: "",
  };

  handleItemSearch = async (searchKey) => {
    if (!searchKey) {
      // this.setState({ pageNum: 1 }, await this.getItemsList());
      await this.getItemsList(1);
      return;
    }

    if (isNaN(searchKey)) {
      searchKey = searchKey.toUpperCase();
    }
    this.setState({ searchKey });
    //reset the pageNum when a search key is changed
    // this.setState({ pageNum: 1 }, await this.getItemsList(searchKey));
    await this.getItemsList(1, searchKey);
  };

  //TODO: Create a Context to store the Items List that are pulled so far & maintain the checkbox selection
  //Also, add MemCache to cache Item List instead of pulling it from the DB each time
  /**
   * Gets the list of Item Code & Desc from Item Master table
   */
  getItemsList = async (pageNum = "", searchKey = "") => {
    console.log("### getItemsList");
    this.setState({ isLoading: true });

    if (pageNum) {
      this.setState({ pageNum });
    } else {
      pageNum = this.state.pageNum;
    }

    //this will be used when scrolling the table after entering a searchKey, at that time handleItemSearch
    //will not be called, so searchKey will be "" in which case state.searchKey will be sent to the API.
    //[or] blank value will be sent while scrolling
    if (!searchKey) {
      searchKey = this.state.searchKey;
    }
    let itemsList = [...this.state.itemsList];
    if (itemsList.length > 6000) {
      this.setState({ hasMore: false });
      return;
    }

    //Reset the itemsList whenever searchKey changes. If it is not reset then the old values will
    //still appear in teh table
    //NOTE: pageNum will be set as '1' in handleItemSearch() only when searchKey chagnes
    if (searchKey && pageNum === 1) {
      itemsList = [];
    }

    try {
      let response,
        pageSize = 100;
      //Added binCode for BinToBin Transfer screen
      if (this.props.binCode) {
        response = await getItemsInBin(this.props.binCode, pageNum, pageSize);
      } else {
        response = await api.get("custom/item", {
          params: { pageNum: pageNum, pageSize, searchKey: searchKey },
        });
        response = response.data;
      }
      console.log(`filterItems - Item List: ${JSON.stringify(response)}`);
      if (Array.isArray(response) && response.length) {
        this.setState({
          pageNum: pageNum + 1,
          itemsList: [...itemsList, ...response],
          hasMore: true,
        });
      }
    } catch (error) {
      console.info("VirtualizedItemList - error: " + JSON.stringify(error));
      this.setState({ warningMsg: error.message ? error.message : "Unable to populate Items" });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  async componentDidMount() {
    await this.getItemsList();
  }

  render() {
    const columns = ["Add", "#", "Item Number", "Item Description"];
    if (!this.props.binCode) {
      columns.push("UOM");
    }
    const { itemsList, isLoading, warningMsg, hasMore } = this.state;
    return (
      <>
        <Modal
          size="lg" //if this prop is not set then the Modal size will be 'medium'
          className="modal-dialog-centered"
          isOpen={this.state.itemListPopup}
          toggle={() => this.props.toggleModal("itemListPopup")}
          backdrop={"static"} //true - clicking outside the Modal will close the Modal.
          //       Modal will have a gray transparent bg
          //false - Modal doesn't close when clicking outside, but the bg will be transparent
          //'static' - Modal doesn't close when clicking outside & it will have a gray bg too
          keyboard={false} //true - pressing Esc button in the Keyboard will close the Modal
        >
          <Card className="modal-header mt--2">
            {/*<span className="heading-small text-muted mb-0">
              Batch Details
            </span>*/}
            <Row className="align-items-center">
              {/* <Col sm="4">
                <h3 className="mb-0 mt--3">Items List</h3>
              </Col>
              <Col className="text-right" sm="8">
                <span className="mb-2 mt-3 pb-1">
                  <i className="fa fa-info-circle text-primary" /> &nbsp;
                    <small>
                      Select the items to add to the request
                  </small>
                </span>
                {this.state.isLoading ?
                  <>
                    <i className="fa fa-info-circle text-blue" /> &nbsp;
                    <small className="my-2 text-primary">
                      Loading please wait...&emsp;
                    </small>
                    <Spinner color="primary" className="reload-spinner mr-4" />
                  </>
                  : null}
                </Col> */}
              <div>
                <h3 className="text-left mb-1 mt-0 mr-4 ml-3">Items List</h3>
              </div>
              <div className="text-right">
                <span className="mb-2 mt-3 pb-1">
                  <i className="fa fa-info-circle text-primary" /> &nbsp;
                  <small>Select the items to add</small>
                </span>
              </div>
            </Row>
            <Row>
              <Col md="6">
                {" "}
                {/** className="align-items-left" */}
                <FormGroup
                  className={classnames({
                    focused: this.state.searchAltFocused,
                  })}
                >
                  <InputGroup className="input-group mb-0 ml-0 mt-2" size="sm">
                    {/** NOTE: input-group-alternative */}
                    <InputGroupAddon addonType="prepend">
                      <InputGroupText>
                        <i className="ni ni-zoom-split-in" />
                      </InputGroupText>
                    </InputGroupAddon>
                    <Input
                      placeholder="Search"
                      type="text"
                      onFocus={(e) => this.setState({ searchAltFocused: true })}
                      onBlur={(e) => this.setState({ searchAltFocused: false })}
                      onKeyUp={(e) => this.handleItemSearch(e.target.value)}
                    />
                  </InputGroup>
                </FormGroup>
              </Col>
              <Col sm="6" md="5">
                {this.state.isLoading && (
                  <Spinner color="primary" size="15" className="reload-spinner mr-4" />
                )}
                {this.state.warningMsg && (
                  <span className="text-warning mr-5 small">
                    <i className="fa fa-exclamation-triangle" /> &nbsp;
                    {this.state.warningMsg}
                  </span>
                )}
              </Col>
              <Col sm="1" className="text-right">
                {/* <button
                  aria-label="Close"
                  data-dismiss="modal"
                  className="close"
                  style={{position:"fixed", top: "40px", right: "12px"}}
                  type="button"
                  onClick={() => this.toggleModal("itemListPopup")}
                >
                  <span aria-hidden={true}>X</span>
                </button> */}
                <Button
                  color="primary"
                  style={{ position: "fixed", top: "50px", right: "30px" }}
                  onClick={() => this.props.toggleModal("itemListPopup")}
                  size="sm"
                >
                  Done
                </Button>
              </Col>
            </Row>
          </Card>
          <div className="modal-body">
            {/** With this added belowe 'table-fixed-head-md' the InfinityScroll table was showing
             * TWO scrollbars so removed it & added the height to <InfiniteScroll> */}
            <Card className="mt--5 shadow table-fixed-head hide-scrollbar">
              <Table
                id="virtualizedTable" //added to let the <InfiniteScroll> use its parent element <Table>'s
                //scrollbar for loading more content
                //When this <table> comp. was placed inside <InfiniteScroll> comp. the table header was
                //not fixed, it started to disappear as I scrolled the table
                size="sm"
                className="align-items-center table-flush"
                responsive
              >
                <InfiniteScroll
                  height={400} //for fixed height elements (such as Modals) this prop must be set
                  //WITHOUT this prop, the method passed to the 'next' prop was NOT exectued when scrolling
                  //only the 1st 100 recs. were loaded and that's it
                  scrollableTarget="virtualizedTable"
                  dataLength={itemsList.length}
                  // next={() => this.getItemsList}
                  // next={async () => await this.getItemsList}

                  next={this.getItemsList}
                  // onScroll={this.getItemsList} //DIDN't Work
                  hasMore={hasMore} //itemsList.length < 6000
                  loader={<small className="text-blue">Loading...</small>}
                  endMessage={
                    <p style={{ textAlign: "center" }}>
                      <small className="text-blue">No more items to display!</small>
                    </p>
                  }
                >
                  {/* <Table size="sm" className="align-items-center table-flush" responsive> */}
                  <thead className="thead-light">
                    <tr>
                      {columns.map((headerCol, key) => {
                        return (
                          <th scope="col" key={key}>
                            {headerCol}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(itemsList) && itemsList.length > 0
                      ? itemsList.map((item, key) => {
                          return (
                            <tr key={item.ItemCode} className="neo-tr">
                              <td>
                                {!this.state.isLoading ? (
                                  <PlusSquare
                                    size={17}
                                    className="text-primary"
                                    onClick={() => this.props.handleItemSelection(item)}
                                  />
                                ) : (
                                  <span>&emsp;</span>
                                )}
                              </td>
                              <td>{key + 1}</td>
                              <td>{item.ItemCode}</td>
                              <td style={{ whiteSpace: "unset" }}>{item.ItemName}</td>
                              {this.props.binCode && <td>{item.InvntryUom}</td>}
                            </tr>
                          );
                        })
                      : null}
                  </tbody>
                </InfiniteScroll>
              </Table>
            </Card>
          </div>
        </Modal>
      </>
    );
  }
}

export default VirtualizedItemsList;
