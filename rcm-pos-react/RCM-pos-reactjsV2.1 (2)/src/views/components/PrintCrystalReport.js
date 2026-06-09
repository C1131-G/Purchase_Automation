import React, { useEffect } from "react";
import { Button } from "reactstrap";
import { customerTypes, draftStatus as draftStatusList, portalModules } from "../../config/config";

// const reportTemplates = {
//   [portalModules.INVOICE]: "DirectSaleInvoice", //B2C
//   [portalModules.SALES_QUOTATION]: "AJAXSalesQuotation"
// }
const PrintCrystalReport = (props) => {
  /**
   * Sends the DocEntry to Crystal Report API and gets the report back as response
   * @param {*} moduleName
   * @param {*} docEntry
   */
  const handlePrint = async (moduleName, docEntry) => {
    const db = process.env.REACT_APP_DB ? process.env.REACT_APP_DB : "";
    const crystalReportURL = process.env.REACT_APP_CRYSTAL_REPORT_URL;
    // const response = axios.get("https://172.18.20.44:9001/ReportWebForm/PrintPDF.aspx",
    //   {params: { docentry: 8271, ReportName: "SalesInvoice", DBName: "" }});
    // console.log("handlePrint - response: "+ JSON.stringify(response));

    window.open(
      `${crystalReportURL}/ReportWebForm/PrintPDF.aspx?docentry=${docEntry}&ReportName=${props.reportName}&DBName=${db}`,
      // "_blank"
      "about:blank",
      "status=no,location=no,toolbar=no,menubar=no",
    );
  };

  useEffect(() => {
    if (
      props.docEntry &&
      props.moduleName === portalModules.INVOICE &&
      props.customerType === customerTypes.B2B
    ) {
      handlePrint(props.moduleName, props.docEntry);
    }
  }, [props.moduleName, props.docEntry, props.reportName]);

  return (
    <>
      {props.buttonType === "button" ? (
        <Button
          size={props.size ? props.zize : "sm"}
          color="info"
          type="button"
          className={props.className ? props.className : "ml-2"}
          onClick={() => handlePrint(props.moduleName, props.docEntry)}
        >
          {props.buttonName ? props.buttonName : "Print"}
        </Button>
      ) : (
        <span
          id={"print-btn"}
          className={`btn-inner--icon cursor-pointer ${props.className ? props.className : ""}`}
          onClick={() => handlePrint(props.moduleName, props.docEntry)}
        >
          <i className="fas fa-print text-red" />
        </span>
      )}
    </>
  );
};

export default PrintCrystalReport;
