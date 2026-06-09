import React from "react";
// reactstrap components
import { Button, FormGroup, Row, Col, CustomInput, Popover, PopoverBody } from "reactstrap";
import { X } from "react-feather";
import QRCode from "qrcode.react";
// import NewWindow from "react-new-window";
import NewWindow from "../../components/NewWindow";
// import "../../assets/css/print.css";

export default class PreviewPrintQRCodes extends React.PureComponent {
  state = {
    preview: false,
    enableBatchSerialNo: true,
    enableItemCode: true,
    enableQty: true,
    printOptionPopover: false,
  };

  togglePreview = () => {
    this.setState((prevState) => ({ preview: !prevState.preview }));
  };

  togglePopover = () => {
    this.setState((prevState) => ({ printOptionPopover: !prevState.printOptionPopover }));
  };

  handleCheckboxChange = (name) => (event) => {
    const value = event.target.checked;
    this.setState({ [name]: value });
  };

  render() {
    const { batchSerialsList, batchNumberProperty, internalSerialNumber, quantity, compactMode } =
      this.props;
    return (
      <>
        {/* <Col className="mt-4 pt-1">
          <Button
            size="sm"
            color="primary"
            onClick={this.handlePrintAll}
        >Preview</Button>
        </Col> */}
        <Col sm="8" className={this.props.className}>
          <Button
            size="sm"
            color="primary"
            // onClick={this.handlePrintAll}
            onClick={this.togglePreview}
          >
            Preview & Print
          </Button>

          {this.props.showPrintOptions && (
            <>
              <span
                id={"printOptionPopoverLink"}
                className="text-primary text-underline cursor-pointer text-xs ml-3 pt-2"
              >
                Print Options
              </span>
              <Popover
                placement="bottom"
                isOpen={this.state.printOptionPopover}
                target={"printOptionPopoverLink"}
                // style={{width: "400px"}}
                toggle={() => this.togglePopover()}
              >
                <h4 className="ml-3 mt-2">Select labels to print</h4>
                <span style={{ position: "fixed", top: 7, right: 12 }}>
                  <X
                    size={18}
                    className="text-danger ml-2"
                    style={{ cursor: "pointer" }}
                    onClick={() => this.togglePopover()}
                  />
                </span>
                {/* <i className="fa fa-info-circle" /> &nbsp; Choose labels to print. */}
                <PopoverBody className="ml-4 mr-3">
                  {/* <Col> */}
                  <Row>
                    <FormGroup>
                      <CustomInput
                        inline
                        bsSize="xs"
                        id="enableBatchSerialNo"
                        type="checkbox"
                        label="Batch/Serial#"
                        className="text-muted mt-3 custom-control-label-sm"
                        checked={this.state.enableBatchSerialNo}
                        disabled
                        onChange={this.handleCheckboxChange("enableBatchSerialNo")}
                      />
                    </FormGroup>
                    {/* </Col>
              <Col> */}
                    <FormGroup>
                      <CustomInput
                        inline
                        id="enableItemCode"
                        type="checkbox"
                        label="Code"
                        className="text-gray mt-3"
                        checked={this.state.enableItemCode}
                        //disabled={this.state.displayMode === "EDIT" ? false : true}
                        onChange={this.handleCheckboxChange("enableItemCode")}
                      />
                    </FormGroup>
                    {/* </Col>
              <Col> */}
                    <FormGroup>
                      <CustomInput
                        inline
                        id="enableQty"
                        type="checkbox"
                        label="Quantity"
                        className="text-gray mt-3"
                        checked={this.state.enableQty}
                        //disabled={this.state.displayMode === "EDIT" ? false : true}
                        onChange={this.handleCheckboxChange("enableQty")}
                      />
                    </FormGroup>
                    {/* </Col> */}
                  </Row>
                </PopoverBody>
              </Popover>
            </>
          )}
        </Col>

        {/* this.state.printAll &&  style={{visibility: "hidden"} */}
        {/* <h3 className="ml-3 donot-printme">Preview</h3> */}
        {/* {this.state.preview &&
      <div className="bg-white shadow mt-0 mb-0 pb-0 ml-3" style={{width: "2.98in"}}> */}
        {/* <CardBody> */}
        {/* <div ref={this.ref}> */}

        {this.state.preview && (
          <NewWindow title="POS-QR Codes" onUnload={this.togglePreview}>
            {" "}
            {/** onOpen={this.printChildWindow} */}
            <div className="qrcode-container">
              {/* <Button
              className="donot-printme"
              size="sm"
              color="primary"
              onClick={() => window.self.print()}
            >Print</Button> */}
              {Array.isArray(batchSerialsList) && batchSerialsList.length > 0
                ? batchSerialsList.map((item, key) => {
                    // if(item.isSelected)
                    return (
                      <>
                        <div /*style={{ height:"0.90in",  }}*/
                          key={`${item[batchNumberProperty]}-${item[internalSerialNumber]}-${item.ItemCode}-${item[quantity]}-${item.WhsCode}-${item.BinCode}`}
                          style={{
                            display: "flex",
                            alignItems: "center",

                            //DO NOT change below values! they are IMPORTANT for the QR Code labels
                            //to print with right margin & padding
                            // marginLeft: "-5px",
                            // marginTop: "-4px",
                            // paddingTop: "40px",
                            // marginBottom: "30px",
                            marginTop: "2px",
                            // border: "2px solid blue",
                            // paddingButton: "20px",
                            // marginBottom: "15px",
                          }}
                          className="qrcode"
                        >
                          {/* <div> */}
                          <QRCode
                            // style={{ float: "left" }} //, marginRight: 2 + "px"
                            id={item.ItemCode}
                            //NOTE: Display Batch# for Batch items or S# for Serial No. items or Display Normal/Labor items
                            //TODO: Need to add Normal item no. below
                            value={`{"${
                              item[batchNumberProperty]
                                ? "BNo"
                                : item[internalSerialNumber]
                                  ? "SNo"
                                  : "No"
                            }":"${
                              item[batchNumberProperty]
                                ? item[batchNumberProperty]
                                : item[internalSerialNumber]
                                  ? item[internalSerialNumber]
                                  : ""
                            }", "ItemCode":"${item.ItemCode}"}`}
                            size={140}
                            level={"M"}
                            includeMargin={true}
                          />
                          {/* </div> */}
                          {/* <br className="donot-printme" /><br /> */}
                          <span className="text-dark font-weight-600" style={{ width: "177px" }}>
                            {this.state.enableBatchSerialNo && (
                              <span className="text-sm">
                                {`${
                                  item[batchNumberProperty]
                                    ? "B"
                                    : item[internalSerialNumber]
                                      ? "SNo"
                                      : "No"
                                }:${
                                  item[batchNumberProperty]
                                    ? item[batchNumberProperty]
                                    : item[internalSerialNumber]
                                      ? item[internalSerialNumber]
                                      : ""
                                }`}
                                <br />
                              </span>
                            )}
                            {this.state.enableItemCode && (
                              <span className="text-md">
                                {" "}
                                {`IC: ${item.ItemCode}`} <br />{" "}
                              </span>
                            )}
                            {this.state.enableQty && (
                              <span className="text-sm">
                                {" "}
                                {`Qty: ${parseFloat(item[quantity]).toFixed(3)}`} <br />{" "}
                              </span>
                            )}
                          </span>
                        </div>
                        {/* <br/> */}
                      </>
                    );
                  })
                : null}
            </div>
          </NewWindow>
        )}
        {/* </div> */}
        {/* </CardBody> */}
        {/* } */}
        {/* </div>
      } */}
      </>
    );
  }
}
