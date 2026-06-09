import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCartArrowDown,
  faCartPlus,
  faCartShopping,
  faHomeAlt,
} from "@fortawesome/free-solid-svg-icons";
import { appPaths } from "../../config/config";

const NavBarLinks = ({ className }) => {
  const location = useLocation();
  // const { hash, pathname, search } = location;

  // useEffect(() => {
  //   console.log("NavBarLinks - location: ", JSON.stringify(location));
  // }, []);

  return (
    <div className={className ? className : ""}>
      {location.pathname === appPaths.CREATE_RETURNS && ( //text-uppercase
        <Link
          to={appPaths.CREATE_INVOICE}
          className="h4 mb-0 ml-3 text-white text-underline d-none d-lg-inline-block"
        >
          <FontAwesomeIcon icon={faCartShopping} size={"md"} className={`text-white mr-1`} />
          Invoice
        </Link>
      )}
      {location.pathname === appPaths.CREATE_INVOICE && (
        <Link
          to={appPaths.CREATE_RETURNS}
          className="h4 mb-0 ml-3 text-white text-underline d-none d-lg-inline-block"
        >
          <FontAwesomeIcon icon={faCartArrowDown} size={"md"} className={`text-white mr-1`} />
          Returns
        </Link>
      )}
      <Link
        to={appPaths.HOME}
        className="h4 mb-0 ml-3 text-white text-underline d-none d-lg-inline-block"
      >
        <FontAwesomeIcon icon={faHomeAlt} size={"md"} className={`text-white mr-1`} />
        Home
      </Link>
    </div>
  );
};

export default NavBarLinks;
