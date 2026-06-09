import React, { useContext, useState, useEffect } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { Col, Row, Card, FormGroup, FormFeedback, Input } from "reactstrap";
import Widgets3 from "../../../components/Widgets3";
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
import {
  openCreateInvoicePage,
  openViewInvoicePage,
  openViewReturnsPage,
  openCreateReturnsPage,
} from "../../../util/navigation.js";
import CustomModal from "../../../components/CustomModal";

import { SalesContext } from "./context/SalesContext";

const SalesActions = ({ setWarningMsg }) => {
  const history = useHistory();
  const location = useLocation();
  const {
    getParkedTrxCount,
    handleParkTrx,
    warehouseCode,
    salesHeader,
    isOneTimeCustomer,
    customer,
    customerAddress,
    salesItems,
    getParkedTrxs,
    deleteParkedTrx,
    resumeTrx,
    setParkedTrans,
    getTotalInvoiceAmount,
  } = useContext(SalesContext);

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
    if (validateForm()) {
      setOpenReasonModal(true);
    }
  };

  const validateForm = () => {
    if (!isOneTimeCustomer && (!customer || !customer.CardName || !customer.CardCode)) {
      setWarningMsg("Select a Customer to proceed!");
      return false;
    } else if (!salesHeader?.SalesPersonCode || salesHeader.SalesPersonCode === -1) {
      setWarningMsg("Select a Sales Employee.");
      return false;
    }
    // else if(!salesHeader?.NumAtCard || salesHeader.NumAtCard === -1) {
    //   setWarningMsg("Enter a Reference#.");
    //   return false;
    // }
    // Address is mandatory for non-OT Customers
    else if (!isOneTimeCustomer && !customerAddress) {
      setWarningMsg("Select an Address.");
      return false;
    } else if (Array.isArray(salesItems) && salesItems.length == 0) {
      setWarningMsg("Select an Item.");
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    setOpenReasonModal(false);
    handleParkTrx();
    setParkReason("");
  };

  const handleChange = (e) => {
    setParkReason(e.target.value);
    setParkedTrans("parkReason", e.target.value);
    setParkedTrans("TotalAmount", getTotalInvoiceAmount(PRECISION));
  };

  const widgetList = [
    {
      title: "Invoice",
      subTitle: "New Items",
      color: "primary",
      size: "lg",
      icon: faCartShopping,
      onClick: openCreateInvoicePage,
      history,
    },
    {
      title: "View",
      subTitle: "Invoices",
      color: "info",
      size: "lg",
      icon: faCartShopping,
      onClick: openViewInvoicePage,
      history,
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
      // icon: "fa fa-play text-success",
      // icon: <Play />
    },
    {
      title: "Return",
      subTitle: "Purchased Items",
      color: "warning",
      size: "lg",
      icon: faRotateLeft,
      onClick: openCreateReturnsPage,
      history,
      // icon: "fa fa-rotate-left text-info",
      // icon: <RotateCcw />
    },

    // {
    //   title: "View",
    //   subTitle: "Return Requests",
    //   color: "info",
    //   size: "lg",
    //   icon: faRotateLeft,
    //   onClick: openViewReturnsPage,
    //   history
    //   // icon: "fa fa-rotate-left text-info",
    //   // icon: <RotateCcw />
    // },
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
          //Hide `Sales` widget when in Sales page, likewise hide `Returns` widget in Returns page
          if (
            !(location.pathname === appPaths.CREATE_INVOICE && widget.title === "Invoice") &&
            !(
              location.pathname === appPaths.CREATE_RETURNS &&
              widget.title === "Return" &&
              widget.subTitle === "Purchased Items"
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

export default SalesActions;
