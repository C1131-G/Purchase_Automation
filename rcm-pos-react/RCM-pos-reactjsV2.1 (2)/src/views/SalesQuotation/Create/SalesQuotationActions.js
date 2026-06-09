import React, { useContext, useState, useEffect } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { Col, Row, Card, FormGroup, FormFeedback, Input } from "reactstrap";
import Widgets3 from "../../../components/Widgets3.js";
import { Pause, Play, RotateCcw } from "react-feather";
import {
  faPause,
  faPlay,
  faRotateLeft,
  faHomeAlt,
  faCartShopping,
} from "@fortawesome/free-solid-svg-icons";
import ParkedTransactionModal from "../../components/POS/ParkedTransactions/index.js";
import { appPaths, PRECISION } from "../../../config/config.js";
import { openViewSalesQuotationPage } from "../../../util/navigation.js";
import CustomModal from "../../../components/CustomModal.js";
import { enableSalesQuotationParkResumeWidget } from "../../../config/config";

import { SalesQuotationContext } from "./context/SalesQuotationContext.js";

const SalesQuotationActions = () => {
  const history = useHistory();
  const location = useLocation();
  const {
    getParkedTrxCount,
    handleParkTrx,
    getParkedTrxs,
    deleteParkedTrx,
    resumeTrx,
    setParkedTrans,
    getTotalSalesQuotationAmount,
  } = useContext(SalesQuotationContext);

  const [openModal, setOpenModal] = useState(false);
  const [parkReason, setParkReason] = useState("");

  const [openReasonModal, setOpenReasonModal] = useState(false);

  const closeModal = () => {
    setOpenModal(false);
  };

  const handleOpenModal = () => {
    setOpenModal(true);
  };
  const closeReasonModal = () => {
    setOpenReasonModal(false);
  };

  const handleOpenReasonModal = () => {
    setOpenReasonModal(true);
  };

  const handleSubmit = () => {
    setOpenReasonModal(false);
    handleParkTrx();
    setParkReason("");
  };

  const handleChange = (e) => {
    setParkReason(e.target.value);
    setParkedTrans("parkReason", e.target.value);
    setParkedTrans("TotalAmount", getTotalSalesQuotationAmount(PRECISION));
  };

  const widgetList = [
    // {
    //   title: "Invoice",
    //   subTitle: "New Items",
    //   color: "primary",
    //   size: "lg",
    //   icon: faCartShopping,
    //   onClick: openCreateInvoicePage,
    //   history
    // },
    {
      title: "View",
      subTitle: "Quotation",
      color: "info",
      size: "lg",
      icon: faCartShopping,
      onClick: openViewSalesQuotationPage,
      history,
      visible: true,
      // icon: "fa fa-rotate-left text-info",
      // icon: <RotateCcw />
    },
    {
      title: "Park",
      subTitle: "Transaction",
      color: "gray",
      size: "lg",
      //onClick: handleParkTrx,
      onClick: handleOpenReasonModal,
      icon: faPause, //FA New
      visible: enableSalesQuotationParkResumeWidget,
      // icon: "fa fa-pause text-warning", //FA Old
      // icon: <Pause /> //React-feather
    },
    {
      title: "Resume",
      subTitle: "Parked transactions",
      //count: getParkedTrxCount(),
      color: "success",
      size: "lg",
      onClick: handleOpenModal,
      icon: faPlay,
      visible: enableSalesQuotationParkResumeWidget,
      // icon: "fa fa-play text-success",
      // icon: <Play />
    },
    // {
    //   title: "Home",
    //   subTitle: "Return To",
    //   color: "info",
    //   size: "lg",
    //   icon: faHomeAlt,
    //   onClick: openHomePage,
    //   history
    // }
  ];

  return (
    <>
      {/* <Col xxl="auto" xl="6" sm="6" className="box-col-6"> */}
      <Row>
        {widgetList.map((widget) => {
          //Hide `Sales Quotation` widget when in Sales Quotation page.
          if (
            !(
              (location.pathname === appPaths.CREATE_QUOTATION && widget.title === "Quotation") ||
              !widget.visible
            )
          ) {
            return (
              <Col key={widget.title}>
                <Widgets3 data={widget} />
              </Col>
            );
          }
        })}
      </Row>
      {/* <Col xl="6">
            <Widgets3 data={parkAction} />
          </Col>
          <Col xl="6">
            <Widgets3 data={resumeAction} />
          </Col>
          <Col xl="6">
            <Widgets3 data={returnAction} />
          </Col> */}
      <ParkedTransactionModal
        isOpen={openModal}
        closeModal={closeModal}
        getParkedTrxs={getParkedTrxs}
        deleteParkedTrx={deleteParkedTrx}
        resumeTrx={resumeTrx}
      />

      <CustomModal
        // modalSize="lg"
        // buttonSize="md"
        isOpen={openReasonModal}
        title={"Park Reason"}
        infoMessage={"Enter the reason for park transanctions"}
        isLoading={false}
        handleSubmit={handleSubmit}
        closeModal={closeReasonModal}
      >
        <Card className="shadow px-3 py-2">
          <Row>
            <Col md="12">
              <small className="text-muted">Park Reason</small>
              <FormGroup className="mt-1">
                <Input
                  bsSize="md"
                  type="textarea"
                  className="form-control display-4 text-gray-dark"
                  name="CardReason"
                  value={parkReason}
                  onChange={handleChange}
                  placeholder="Enter Park Reason"
                />
              </FormGroup>
            </Col>
          </Row>
        </Card>
      </CustomModal>
    </>
  );
};

export default SalesQuotationActions;
