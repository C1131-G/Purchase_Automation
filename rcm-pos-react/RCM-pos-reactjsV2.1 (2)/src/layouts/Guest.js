import React, { Suspense } from "react";
import { Route, Switch, Redirect } from "react-router-dom";
// reactstrap components
import { Container, Row, Col } from "reactstrap";
import { companyTitle } from "../config/config";

// core components
import GuestNavbar from "components/Navbars/AuthNavbar.js";
import GuestFooter from "components/Footers/AuthFooter.js";
import Login from "../views/Login";
import routes from "routes.js";

class Guest extends React.Component {
  // componentDidMount() {
  //   document.body.classList.add("bg-default");
  // }
  // componentWillUnmount() {
  //   document.body.classList.remove("bg-default");
  // }
  getRoutes = (routes) => {
    return routes.map((prop, key) => {
      if (prop.layout === "/g") {
        return <Route path={prop.layout + prop.path} component={prop.component} key={key} />;
      } else {
        return null;
      }
    });
  };
  render() {
    return (
      <>
        {/* To set BG Image -  style={{backgroundImage:`url(${require("assets/img/login-bg.png")})`}} */}
        <div className="main-content">
          <div className="pt-3 pl-4">
            <img
              height="75px"
              // src={require("assets/img/brand/logo-md.png")}
            />
            &nbsp;
            <b
              style={{
                color: "#1b419a",
                fontSize: "1.1rem",
                fontWeight: 700,
                fontFamily: `'Source Sans Pro',Helvetica,Tahoma,Arial,sans-serif`,
                textTransform: "uppercase",
              }}
              className="text-large"
            >
              {companyTitle}
            </b>
          </div>
          {/* <GuestNavbar /> */}
          {/* <div className="header bg-gradient-info py-7 py-lg-8"> */}
          {/* <div className="header py-7 py-lg-8">
            <Container>
              <div className="header-body text-center">
                <Row className="justify-content-center">
                  <Col lg="5" md="6">
                    <h1 className="text-white">Welcome!</h1>
                    <p className="text-lead text-light">
                      &nbsp;
                    </p>
                  </Col>
                </Row>
              </div>
            </Container>
          </div> */}
          {/* Page content */}
          {/* <Container className="mt--8 pb-5"> */}
          <Container className="pb-5 pt-2 pb-lg-5 pt-lg-2 mt-md-0 mt-lg-0">
            <Row className="justify-content-center">
              <Suspense fallback={<div>Loading...</div>}>
                <Switch>
                  {this.getRoutes(routes)}
                  <Route path="/g/login" component={Login} />
                  <Redirect from="*" to="/g/login" />
                </Switch>
              </Suspense>
            </Row>
          </Container>
        </div>
        {/* <GuestFooter /> */}
      </>
    );
  }
}

export default Guest;
