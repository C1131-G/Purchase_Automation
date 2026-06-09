import React from "react";
import QrReader from "react-qr-reader";

const previewStyle = {
  height: "100%",
  width: "100%", //150,
  display: "flex",
  justifyContent: "center",
};

const camStyle = {
  display: "flex",
  justifyContent: "center",
};

const warningStyle = {
  color: "orange",
  fontSize: "18px",
  textAlign: "center",
};

class QrContainer extends React.Component {
  state = {
    displayScanner: false,
    data: "Hold the device steady to scan",
    warningMsg: "",
  };

  toggleDisplay = () => {
    this.setState({ displayScanner: true });
  };

  handleScan = (data) => {
    if (data) {
      this.props.getRecord(data);
      this.setState({ data });
    }
  };
  /*
	handleScan = (data) => {
		let displayScanner = true;
		let warningMsg = "Please scan a valid QR Code";
		console.info("data: "+ data);
		if(data) {
			try{
				data = JSON.parse(data);
				if(data.ItemCode) {
					warningMsg = "";
					displayScanner = false //close the scanner after a successful scan
				}
			}
			catch(err) {
				console.error("ERROR:"+ err);
				data = "";
			}
		}
		this.setState({ data, displayScanner, warningMsg });
	} */

  handleError = (err) => {
    console.info("QRCodeScanner - handleError: " + JSON.stringify(err));
    let warningMsg =
      "Unable to open device's camera! Please use the textbox to enter Batch/Serial Nos.";
    if (err.message && err.message === "No video input devices found")
      warningMsg = "No camera detected! Please use the textbox to enter Batch/Serial Nos.";
    this.setState({ warningMsg });
  };

  render() {
    return (
      <>
        <div style={camStyle}>
          {this.props.displayScanner && (
            <QrReader
              delay={3000} //delay between scans in milliseconds
              style={previewStyle}
              onScan={this.handleScan}
              onError={this.handleError}
              showViewFinder={false}
              facingMode={"environment"} //"user"
            />
          )}
        </div>

        {/* <p>{this.state.data}</p> */}
        {/* <p style={warningStyle}>{this.state.warningMsg}</p> */}
        {this.state.warningMsg ? (
          <span className="text-warning text-center small">{this.state.warningMsg}</span>
        ) : (
          <span className="text-primary text-center small">{this.state.data}</span>
        )}
      </>
    );
  }
}

export default QrContainer;
