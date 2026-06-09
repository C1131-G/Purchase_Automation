import React, { useRef } from "react";
import { Card, Row, Col, Button, Modal } from "reactstrap";
import "../../../assets/css/report.css";
// import qr_rcm from "../../../assets/img/qr_rcm.png"; // Unused
import companyLogo from "../../../assets/img/brand/logos.jpg";
import {
  companyNames,
  companyInfo,
  companyInfo2,
  DEFAULT_TAX_PERCENT,
  ajaxCompanyTIN as companyTIN,
} from "../../../config/config";
// import { roundPrice } from "../../common-utils/calculations.util.js"; // Unused

const InvoiceReceiptModel = (props) => {
  const receiptRef = useRef();

  const correctTaxAmount = props.tax || 0;

  const closeModal = () => {
    props.closeModal();
  };

  const handlePrint = () => {
    // Create a hidden iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    // Get the document of the iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    // Write the content to the iframe
    iframeDoc.open();
    iframeDoc.write(`
      <html>
        <head>
          <title>Print Receipt</title>
          <style>
            @page {
              size: 80mm auto; /* Set the width for the receipt */
              margin: 20px 2px 2px 10px; /* Set the margins: top, right, bottom, left */
            }
            body { 
              font-family: Arial, sans-serif;
              font-size: 12px;
              margin: 0;
              padding: 0;
              line-height: 1;
            }
            .receipt-content {
              flex-direction: column;
              width: calc(100% - 20px); /* Adjust for the left and right margins */
              padding: 5px 0;
              box-sizing: border-box;
            }
            .thin-hr {
              border-top: 1px solid #000;
              margin: 10px 0;
            }
            .parra {
              margin: 5px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid black;
              padding: 8px;
              text-align: left;
            }
            .text-center {
              text-align: center;
              margin: 0 !important;
              padding: 0 !important;
            }
            .d-flex {
              display: flex;
              justify-content: space-between;
              margin: 0 !important;
              padding: 0 !important;
            }
            body, .receipt-content, .parra, h2, h3, h4, h5, table, th, td {
              line-height: 1.1 !important; /* Reduce line height */
            }
          </style>
        </head>
        <body>
          <div class="receipt-content">
            ${receiptRef.current.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                document.body.removeChild(iframe);
              }, 100);
            };
          </script>
        </body>
      </html>
    `);
    iframeDoc.close();
  };

  const company =
    process.env.REACT_APP_COMPANY_NAME === companyNames.AJAX ? companyInfo : companyInfo2;

  return (
    <>
      <Modal
        autoFocus={props.disableAutoFocus ? false : true}
        size={props.modalSize}
        className="modal-dialog-centered modal-large"
        contentClassName="neo-modal"
        isOpen={props.isOpen}
        closeModal={closeModal}
        toggle={props.toggleModal}
        backdrop={"static"}
        keyboard={props.closeWithEsc}
      >
        <div className="header mt-3">
          <div className="d-flex justify-content-center">
            {" "}
            <Button color="primary" onClick={handlePrint}>
              Print
            </Button>
          </div>
          <Button className="close-btn" onClick={closeModal}>
            <i className="fas fa-times-circle"></i>
          </Button>
        </div>
        <div className="modal-body">
          <Card className="border-0">
            <Row>
              <Col>
                {/* Display the receipt details here */}
                <div
                  ref={receiptRef}
                  className="receipt-content"
                  style={{ flexDirection: "column" }}
                >
                  <div className="d-flex justify-content-center">
                    <img className="" alt="Company Logo" width="180px" src={companyLogo} />
                  </div>
                  <h2 className="text-center">{props.companyName}</h2>
                  <h3 className="text-center">{props.companyAddress}</h3>
                  <h3 className="text-center">
                    Store: <span>{props.companyStore}</span>
                  </h3>
                  <h3 className="text-center">
                    Phone: <span>{props.companyPhone}</span>
                  </h3>
                  <h3 className="text-center">
                    Website: <span>{props.companyWebsite}</span>
                  </h3>
                  <h3 className="text-center">
                    Email: <span>{company.companyEmail}</span>
                  </h3>
                  <h3 className="text-center">
                    <strong>{props.invoiceType}</strong>
                  </h3>
                  <h4 className="text-center">
                    TIN # : <span>{companyTIN}</span>
                  </h4>
                  <h4 className="text-center">
                    POS No : <span>{props.posNo}</span>
                  </h4>
                  <h4 className="text-center">
                    POS Time : <span>{props.firstDate}</span>
                  </h4>

                  <h4 className="text-center">{props.secondDate}</h4>
                  <div className="thin-hr" />
                  <p className="parra">
                    <b>Cashier/ Served By :</b>{" "}
                    <span className="mx-4">
                      {" "}
                      <b>{props.userName}</b>
                    </span>
                  </p>
                  <p className="parra">
                    <b>Cashier TIN# :</b>{" "}
                    <span className="mx-4">
                      <b>{props.cashierTIN}</b>
                    </span>
                  </p>
                  <p className="parra">
                    <b>Customer# :</b>{" "}
                    <span className="mx-4">
                      <b> {props.customerTIN}</b>
                    </span>
                  </p>
                  <p className="parra">
                    <b>Customer Name# :</b>{" "}
                    <span className="mx-4">
                      <b> {props.customerName}</b>
                    </span>
                  </p>
                  <p className="parra">
                    <b>Customer Mobile# :</b>{" "}
                    <span className="mx-4">
                      <b> {props.customerMobile}</b>
                    </span>
                  </p>
                  <p className="parra">
                    <b>Reference No : </b>{" "}
                    <span className="mx-4">
                      <b>{props.referenceNo}</b>
                    </span>
                  </p>
                  <p className="parra">
                    <b>Invoice No : </b>{" "}
                    <span className="mx-4">
                      <b>{props.invoiceNo}</b>
                    </span>
                  </p>

                  <h2 className="text-center">{props.salesType}</h2>
                  <div className="thin-hr" />
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ border: "1px solid black", padding: "8px" }}>
                          Item & Description
                        </th>
                        <th style={{ border: "1px solid black", padding: "8px" }}>Qty</th>
                        <th style={{ border: "1px solid black", padding: "8px" }}>Price</th>
                        <th style={{ border: "1px solid black", padding: "8px" }}>UOM</th>
                        <th style={{ border: "1px solid black", padding: "8px" }}>Ex. Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {props.documentLines?.map((line, index) => (
                        <React.Fragment key={index}>
                          <tr>
                            <td
                              style={{
                                border: "0px solid black",
                                padding: "8px",
                              }}
                            >
                              <b>{line.ItemCode}</b> <br /> {line.ItemName}
                            </td>
                            <td
                              style={{
                                border: "0px solid black",
                                padding: "8px",
                              }}
                            >
                              {parseFloat(line.Quantity)?.toFixed(2)}
                            </td>
                            <td
                              style={{
                                border: "0px solid black",
                                padding: "8px",
                              }}
                            >
                              {parseFloat(line.NetUnitPrice)?.toFixed(2)}
                            </td>
                            <td
                              style={{
                                border: "0px solid black",
                                padding: "8px",
                              }}
                            >
                              {line.UomCode ?? ""}
                            </td>
                            <td
                              style={{
                                border: "0px solid black",
                                padding: "8px",
                              }}
                            >
                              {parseFloat(line.TotalPriceWithTax || 0)?.toFixed(2)}
                            </td>
                          </tr>
                          {line.Pcs > 0 && (
                            <tr>
                              <td
                                style={{
                                  border: "0px solid black",
                                  padding: "8px",
                                }}
                              >
                                No of Pcs:{" "}
                              </td>
                              <td
                                style={{
                                  border: "0px solid black",
                                  padding: "8px",
                                }}
                              >
                                <b>{line.Pcs}</b>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                  <div className="thin-hr" />
                  <div className="d-flex justify-content-between">
                    <h3 className=" lh-080">Sub Total ({props.totalQty})</h3>{" "}
                    <h3 className=" lh-080">Items: {parseFloat(props.subTotal)?.toFixed(2)}</h3>
                  </div>
                  <div className="d-flex justify-content-between">
                    <h3 className=" lh-080">VAT (Component):</h3>{" "}
                    <h3 className=" lh-080">{correctTaxAmount.toFixed(2)}</h3>
                  </div>
                  <div className="d-flex justify-content-between">
                    <h3 className=" lh-080">Rounded Off: </h3>
                    <h3 className=" lh-080">{parseFloat(props.roundOff)?.toFixed(2)}</h3>
                  </div>
                  <div className="d-flex justify-content-between">
                    <h3 className=" lh-080">Total:</h3>{" "}
                    <h3 className=" lh-080">{parseFloat(props.totalAmount)?.toFixed(2)}</h3>{" "}
                  </div>
                  <div className="d-flex justify-content-between">
                    <h3 className=" lh-080">EFTPOS Charge: </h3>{" "}
                    <h3 className=" lh-080">
                      {props.surcharge ? parseFloat(props.surcharge)?.toFixed(2) : "0.00"}
                    </h3>
                  </div>
                  <div className="d-flex justify-content-between">
                    <h3 className=" lh-080">Payment Method:</h3>{" "}
                    <h3 className=" lh-080">{props.paymentType}</h3>
                  </div>
                  <div className="thin-hr" />

                  <div className="d-flex justify-content-between">
                    <h3 className=" lh-080">Amount Tendered:</h3>{" "}
                    <h3 className=" lh-080">
                      {props.paidAmount ? parseFloat(props.paidAmount)?.toFixed(2) : "0.00"}
                    </h3>
                  </div>
                  <div className="d-flex justify-content-between">
                    <h3 className=" lh-080">Change:</h3>
                    <h3 className=" lh-080">{parseFloat(props.change)?.toFixed(2)}</h3>
                  </div>
                  <div className="thin-hr" />
                  <h4 className="text-center 1h-100">VAT Specification</h4>
                  <div className="d-flex justify-content-center align-items-center vat-table">
                    <table>
                      <thead>
                        <tr>
                          <th className="px-2 ">Label</th>
                          <th className="px-2">Name</th>
                          <th className="px-2">Rate</th>
                          <th className="px-2">Tax</th>
                          <th className="px-2">Total Tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ border: "0px solid black" }} className="px-2">
                            D
                          </td>
                          <td style={{ border: "0px solid black" }} className="px-2">
                            VAT
                          </td>
                          <td style={{ border: "0px solid black" }} className="px-2">
                            {props.documentLines && props.documentLines.length > 0
                              ? props.documentLines[0].TaxPercent
                              : DEFAULT_TAX_PERCENT}
                            .00%
                          </td>
                          <td style={{ border: "0px solid black" }} className="px-2">
                            {correctTaxAmount.toFixed(2)}
                          </td>
                          <td style={{ border: "0px solid black" }} className="px-2">
                            {correctTaxAmount.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="borders">
                    <br />
                  </div>
                  <div className="d-flex justify-content-around">
                    <h3 className=" lh-080">Total Tax</h3>
                    <h3 className=" lh-080">{correctTaxAmount.toFixed(2)}</h3>
                  </div>

                  <div className="thin-hr" />
                  <div className="d-flex justify-content-between">
                    <h4 className=" lh-080">Cash Amount:</h4>
                    <h4 className=" lh-080">{parseFloat(props.totalAmount)?.toFixed(2)}</h4>
                  </div>
                  <div className="d-flex justify-content-between">
                    <h4 className=" lh-080">Other Details:</h4>
                    <h4 className=" lh-080"></h4>
                  </div>
                  <div className="d-flex justify-content-between">
                    <h4 className=" lh-080">Vehicle No: {props.vehicleNo}</h4>
                    <h4 className=" lh-080"></h4>
                  </div>
                  <div className="d-flex justify-content-between">
                    <h4 className=" lh-080">VAT System Checked By</h4>
                    <h4 className=" lh-080"></h4>
                  </div>

                  <div className="thin-hr" />
                  <div className="d-flex justify-content-between">
                    <h4 className=" lh-080">Remarks : </h4>
                    <h4 className="lh-080">
                      <b>{props.comments}</b>
                    </h4>
                  </div>
                  <div className="d-flex justify-content-between">
                    <h4 className=" lh-080">Terminal : </h4>
                    <h4 className="lh-080">
                      <b>{props.terminal}</b>
                    </h4>
                  </div>
                  <div className="d-flex justify-content-between">
                    <h4>
                      <b>
                        <u>TERMS & CONDITIONS</u>
                      </b>
                    </h4>
                  </div>
                  <div className="d-flex justify-content-between">
                    <h5 className=" lh-080">
                      <i>
                        You must choose carefully. The laws as established by the Fijian Competition
                        and Consumer Commission Act 2010 and the Sale of Goods Act applies in
                        respect of returns, refunds and/or replacement. In all other circumstances,
                        we reserve the right to refuse a return, refund or replacement. If you wish
                        to return or replace goods or seek a refund you must: -{" "}
                      </i>
                    </h5>
                  </div>
                  <div className="d-flex justify-content-between">
                    <h5 className=" lh-080">
                      <i>1. Provide proof of Purchase.</i>
                    </h5>
                  </div>
                  <div className="d-flex justify-content-between">
                    <h5 className=" lh-080">
                      <i>2. Bring the goods undamaged and in original packaging.</i>
                    </h5>
                  </div>
                  <div className="d-flex justify-content-between">
                    <h5 className=" lh-080">
                      <i>3. Make your claim within 7 (Seven) days from the date of Purchase.</i>
                    </h5>
                  </div>
                  <div className="d-flex justify-content-between">
                    <h5 className=" lh-080">
                      <i>
                        4. If your right to return, refund or replacement does not arise because of
                        a breach of any guarantees provided under the Commerce Commission Act, then
                        we may charge a handling fee not exceeding 10% of the value of goods.
                      </i>
                    </h5>
                  </div>
                  <div className="d-flex justify-content-between">
                    <h5 className=" lh-080">
                      <i>
                        <b>Important: </b>All purchases are subject to our Terms and Conditions of
                        Sale. Scan the QR code with your phone to read these terms now or visit our
                        website https://rcmanubhai.com.fj By proceeding to payment, you acknowledge
                        that you had the opportunity to review and accept the terms and conditions.
                      </i>
                    </h5>
                  </div>
                  <div className="d-flex justify-content-center">
                    {
                      <img
                        src={companyLogo}
                        alt="QR Code"
                        width="80"
                        height="80"
                        style={{ objectFit: "contain" }}
                      />
                    }
                  </div>
                  {props.totalAmount > 50 && (
                    <>
                      <div className="thin-hr" />
                      <div className="d-flex justify-content-center">
                        <h4 className="text-center">
                          <b>
                            Congratulations! Your purchase with R.C.Manubai has qualified for
                            Christmas 2025 Lucky draw.
                          </b>
                        </h4>
                      </div>
                    </>
                  )}
                  <h2 className="text-center">
                    <b>THANK YOU</b>
                  </h2>
                  <h4 className="text-center">
                    <b>For Shopping At R.C.MANUBHAI & Co. PTE LTD</b>
                  </h4>
                  <div className="d-flex justify-content-between">
                    <h3 className=" lh-080">SDC Time : {props.sdcTime}</h3>{" "}
                  </div>
                  <div className="d-flex justify-content-between">
                    <h3 className=" lh-080">SDC Invoice No : {props.sdcInvoiceNo}</h3>{" "}
                  </div>
                  <div className="d-flex justify-content-between">
                    <h3 className=" lh-080">Invoice Counter : {props.invoiceCounter}</h3>{" "}
                  </div>
                  <div className="d-flex justify-content-center">
                    {props.qrCode ? <img src={props.qrCode} alt="QR Code" /> : null}
                  </div>
                  <h2 className="text-center">{props.endOfInvoice}</h2>
                </div>
              </Col>
            </Row>
          </Card>
        </div>
        <div className="modal-footer"></div>
      </Modal>
    </>
  );
};

export default InvoiceReceiptModel;
