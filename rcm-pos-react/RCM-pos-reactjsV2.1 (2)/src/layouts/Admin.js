import React, { Suspense } from "react";
import { Route, Switch, Redirect } from "react-router-dom";
// reactstrap components
import { Container } from "reactstrap";
// core components
import AdminNavbar from "../components/Navbars/AdminNavbar.js";
import AdminFooter from "../components/Footers/AdminFooter.js";
import Sidebar from "../components/Sidebar/Sidebar.js";
import ScrollToTop from "components/ScrollToTop.js";
import { getDiffInMinutes, clearLocalStorage } from "../config/util";
import { companyNames, httpStatusCodes, statusColors } from "../config/config.js";
import routes from "routes.js";

import { FavouritesContext } from "../contexts/FavouritesContext";
import {
  getFavourites,
  isMenuAddedToFavourites,
  addMenuToFavourites,
  removeMenuFromFavourites,
} from "../util/favouritesMenu";

import { UserPermissionsContext } from "../contexts/UserPermissionsContext";

class Admin extends React.Component {
  static contextType = UserPermissionsContext;

  //NOTE: 'context.addMenuToFavourites' was 'undefined' in FavouriteButtons comp where I use the 'context'
  //after adding the methods within the 'construtor' fixed it
  state = {
    filteredRoutes: [],
    favouritesMenu: [],

    //adding the methods to the 'state' for them to be accessible via Context
    addMenuToFavourites: this.addMenuToFavourites,
    removeMenuFromFavourites: this.removeMenuFromFavourites,
  };

  /**
   * Loads the Favourites from 'LocalStorage' to 'context' on initial page load & on each page refresh
   */
  getFavourites = () => {
    this.setState({ favouritesMenu: getFavourites() });
  };

  /**
   * Adds the favourite menu the 'LocalStorage' and sets the updated value to 'context' as well
   */
  addMenuToFavourites = (url) => {
    const favouritesMenu = addMenuToFavourites(url);
    this.setState({ favouritesMenu });
  };

  /**
   * Removes the favourite menu from the 'LocalStorage' and sets the updated value to 'context' as well
   */
  removeMenuFromFavourites = (url) => {
    this.setState({ favouritesMenu: removeMenuFromFavourites(url) });
  };

  getRoutes = (routes) => {
    return routes.map((route, key) => {
      if (["/u", "/pos"].includes(route.layout)) {
        return <Route path={route.layout + route.path} component={route.component} key={key} />;
      } else if (route.children) {
        return this.getRoutes(route.children);
      } else {
        return null;
      }
    });
  };
  getBrandText = (routes) => {
    const path = this.props.location.pathname;
    return routes.map((route) => {
      if (route.children) {
        return this.getBrandText(route.children);
      } else {
        if (path.indexOf(route.layout + route.path) !== -1) {
          return route.name;
        }
      }
    });
  };

  /**
   * Filter routes based on the currently logged in user's authorization
   */
  filterRoutes = () => {
    let filteredRoutes = [],
      filteredSubRoutes = [];
    const { checkUserPermission } = this.context;

    routes.forEach((route) => {
      filteredSubRoutes = [];

      //for items with Sub-menu loop through the children and filter the routes based on permission
      if (route.children) {
        route.children.forEach((subRoute) => {
          if (!subRoute.module || checkUserPermission(subRoute.module, subRoute.permission)) {
            filteredSubRoutes.push(subRoute);
          }
        });
        filteredRoutes.push({
          name: route.name,
          icon: route.icon,
          children: filteredSubRoutes,
        });
      }
      //add the routes if it doesnt have a 'module' linked to it or if the current user has the required permission
      else if (!route.module || checkUserPermission(route.module, route.permission)) {
        filteredRoutes.push(route);
      }
    });
    this.setState({ filteredRoutes });
  };

  redirectToLoginPage = () => {
    clearLocalStorage();
    this.props.history.push({
      pathname: "/g/login",
      state: {
        message: "Session expired! Please login to continue!",
        type: statusColors.DANGER,
      },
    });
  };

  componentDidUpdate(e) {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
    this.refs.mainContent.scrollTop = 0;

    const { statusCode } = this.context;
    console.log("Admin.js - componentDidUpdate statusCode: ", statusCode);
    if (statusCode === httpStatusCodes.UNAUTHORIZED) {
      this.redirectToLoginPage();
    }
  }

  async componentDidMount() {
    const currentTime = new Date();
    const loggedInTime = localStorage.getItem("loginTime");
    console.log(`currentTime: ${currentTime} | loggedInTime: ${loggedInTime}`);
    console.log(`differenceInMinutes: ${getDiffInMinutes(currentTime, loggedInTime)}`);
    // if (getDiffInMinutes(currentTime, loggedInTime) > 30 || localStorage.getItem("UserName") == null || localStorage.getItem("permissions") == null) {
    /*if (localStorage.getItem("UserName") == null || localStorage.getItem("permissions") == null) {
      this.setState ({ message: "Session timed out! Please login to continue"});
      // localStorage.clear();
      clearLocalStorage();
      this.props.history.push("/g/login");
    }
    else {*/

    console.log("Admin.js - compDidMount");
    const { refreshUserInfo } = this.context;
    if (await refreshUserInfo()) {
      this.filterRoutes();
      this.getFavourites();
    }
    // Commented to stop redirecting user to Login page in case backend server is not responsive
    // else {
    //   this.redirectToLoginPage();
    // }
    /* } */
  }

  render() {
    return (
      <>
        <ScrollToTop />
        <Sidebar
          className="donot-printme"
          {...this.props}
          routes={this.state.filteredRoutes}
          logo={{
            innerLink: "/u/dashboard",
            imgSrc:
              process.env.REACT_APP_COMPANY_NAME === companyNames.AJAX
                ? require("assets/img/brand/logos.jpg")
                : require("assets/img/brand2/logos.jpg"),
            imgAlt: "...",
          }}
        />
        {/** Added 'id' for Collapsible Sidemenu */}
        <div id="main" className="main-content" ref="mainContent">
          <FavouritesContext.Provider value={this.state}>
            <AdminNavbar
              className="donot-printme"
              {...this.props}
              brandText={this.getBrandText(this.state.filteredRoutes)}
            />
            <Suspense fallback={<div>Loading...</div>}>
              <Switch>
                {this.getRoutes(this.state.filteredRoutes)}
                {/* NOTE: Whenever I refresh the screen from a page, the React app landed on the Home page
                  (Dashboard) instead of returning back to the page where I did the refresh.
                  Commenting the below code fixed the issue! DAMN!! I didnt expect this to fix the issue, was
                  just trying & it worked!!

                  <Redirect from="*" to="/u/dashboard" /> */}
              </Switch>
            </Suspense>
          </FavouritesContext.Provider>
          <Container fluid className="donot-printme">
            <AdminFooter />
          </Container>
        </div>
      </>
    );
  }
}

export default Admin;
