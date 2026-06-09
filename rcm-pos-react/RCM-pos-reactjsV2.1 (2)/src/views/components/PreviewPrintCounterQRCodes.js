import React from "react";
// reactstrap components
import { Button, FormGroup, Row, Col, CustomInput, Popover, PopoverBody } from "reactstrap";
import { X } from "react-feather";
import QRCode from "qrcode.react";
import NewWindow from "../../components/NewWindow";

export default class PreviewPrintCounterQRCodes extends React.PureComponent {
  state = {
    preview: false,
    enableCounterName: true,
    enableCounterCode: true,
    printOptionPopover: false,
  };

  togglePreview = (clearList = false) => {
    this.setState((prevState) => ({ preview: !prevState.preview }));

    //ZZZ: Added to clear selected Counter list when Print btn is clicked. But DIDN'T work!
    // if(this.props.handlePrint && clearList) {
    //   this.props.handlePrint();
    // }
  };

  togglePopover = () => {
    this.setState((prevState) => ({ printOptionPopover: !prevState.printOptionPopover }));
  };

  handleCheckboxChange = (name) => (event) => {
    const value = event.target.checked;
    this.setState({ [name]: value });
  };

  render() {
    const { counterList } = this.props;
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
            color={this.props.color}
            // onClick={this.handlePrintAll}
            onClick={this.togglePreview}
          >
            {this.props.label}
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
                        id="enableCounterName"
                        type="checkbox"
                        label="Counter Name"
                        className="text-muted mt-3 custom-control-label-sm"
                        checked={this.state.enableCounterName}
                        disabled
                        onChange={this.handleCheckboxChange("enableCounterName")}
                      />
                    </FormGroup>
                    {/* </Col>
              <Col> */}
                    <FormGroup>
                      <CustomInput
                        inline
                        id="enableCounterCode"
                        type="checkbox"
                        label="Code"
                        className="text-gray mt-3"
                        checked={this.state.enableCounterCode}
                        //disabled={this.state.displayMode === "EDIT" ? false : true}
                        onChange={this.handleCheckboxChange("enableCounterCode")}
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
          <NewWindow title="POS-Counter QR Codes" onUnload={() => this.togglePreview(true)}>
            {" "}
            {/** onOpen={this.printChildWindow} */}
            <div className="qrcode-container">
              {/* <Button
              className="donot-printme"
              size="sm"
              color="primary"
              onClick={() => window.self.print()}
            >Print</Button> */}
              {Array.isArray(counterList) && counterList.length > 0
                ? counterList.map((counter, key) => {
                    return (
                      <>
                        <div /*style={{ height:"0.90in",  }}*/
                          key={`${counter.counterCode}`}
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
                            id={counter.counterCode}
                            value={counter.counterCode}
                            size={140}
                            level={"M"}
                            includeMargin={true}
                          />
                          {/* </div> */}
                          {/* <br className="donot-printme" /><br /> */}
                          <span className="text-dark font-weight-600" style={{ width: "177px" }}>
                            {this.state.enableCounterName && (
                              <span className="text-sm">
                                {`Counter: ${counter.counterName}`}
                                <br />
                              </span>
                            )}
                            {this.state.enableCounterCode && (
                              <span className="text-sm">
                                {" "}
                                {`Code: ${counter.counterCode}`} <br />{" "}
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
