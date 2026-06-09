import React from "react";

// reactstrap components
import { Card, CardBody, CardTitle, Container, Row, Col } from "reactstrap";

class Header extends React.Component {
  render() {
    return (
      <>
        {/** Using pb-8 increased the size of the Gradient blue bg
         *  reducing pt-md-8 to pt-md-4 decreased the dist bw the Navbar and the contents below in each page,
         *  further reducing it to pt-md-2 made the Navbar contents overlap on the actual "page" contents
         */}
        <div className="header bg-gradient-primary pb-5 pt-4"></div>
      </>
    );
  }
}

export default Header;
