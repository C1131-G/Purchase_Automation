import React from "react";
import { Link } from "react-router-dom";
import { Dropdown, DropdownMenu, DropdownItem, DropdownToggle, Badge } from "reactstrap";
import { Star } from "react-feather";

import { getFavourites } from "../../util/favouritesMenu";
import { FavouritesContext } from "../../contexts/FavouritesContext";

export default class FavouritesDropdown extends React.PureComponent {
  static contextType = FavouritesContext;
  state = {
    showFavouritesMenu: false,
    favouritesMenu: null,
  };

  togglefavouritesMenu = () => {
    this.setState((prevState) => ({ showFavouritesMenu: !prevState.showFavouritesMenu }));
  };

  onMouseEnter = () => {
    this.setState({ showFavouritesMenu: true });
  };

  onMouseLeave = () => {
    this.setState({ showFavouritesMenu: false });
  };

  componentDidUpdate(prevProp, prevState) {
    //NOTE: Without this logic inside 'componentDidUpdate' the Fav Menu was not getting updated
    //whenver I added/removed Fav screens
    const context = this.context;
    if (prevState.favouritesMenu !== context.favouritesMenu) {
      // let favourites = getFavourites();
      this.setState({ favouritesMenu: context.favouritesMenu });
    }
  }

  componentDidMount() {
    /** NOTE: Below code didn't update the Fav Menu as and when user added/removed fav. items. So added
    * 'componentDidUpdate'

    const context = this.context;
    this.setState({ favouritesMenu: context.favouritesMenu });
    */
  }

  render() {
    let favCount = 0;
    const { favouritesMenu } = this.state;
    if (Array.isArray(favouritesMenu) && favouritesMenu.length > 0) {
      favCount = favouritesMenu.length;
    }
    return (
      <Dropdown
        nav
        className="mr-3 d-none d-md-flex ml-lg-auto"
        isOpen={this.state.showFavouritesMenu}
        toggle={this.togglefavouritesMenu}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
      >
        <DropdownToggle className="pr-0 btn" nav>
          <Star
            id="favouritesButton"
            size={20}
            color="white"
            className="cursor-pointer mr-1 d-none d-md-flex ml-lg-auto"
            // onClick={this.togglefavouritesMenu}
          />
          {favCount > 0 && (
            <Badge
              className="badge-circle badge-floating badge-info-notification border-info" //border-white
              size="md"
            >
              {favCount}
            </Badge>
          )}
        </DropdownToggle>
        <DropdownMenu className="dropdown-menu-arrow" right>
          <DropdownItem className="noti-title mb--1" header tag="div">
            <h6 className="text-blue text-overflow m-0">Favourites</h6>
          </DropdownItem>
          {Array.isArray(favouritesMenu) && favouritesMenu.length > 0 ? (
            favouritesMenu.map((fav, key) => {
              return (
                // <tr
                //   key={fav.path}
                //   id={"trId"+key}
                //   className="cursor-pointer"
                //   onClick={() =>
                //     this.handleFavouriteClick(fav)}
                // >
                //   <td>{fav.subMenu}</td>
                // </tr>

                // Option#1
                // <NavItem key={fav.subMenu+fav.path}>
                //   <NavLink
                //     to={fav.path}
                //     tag={NavLinkRRD}
                //   >
                <>
                  {/* Option#3 - Icon & Lable alignment mismatch */}
                  <DropdownItem
                    className={key === 0 ? "" : "border-top border-1"}
                    to={fav.path}
                    tag={Link}
                    key={fav.subMenu + fav.path}
                  >
                    {fav.parentMenu && (
                      <>
                        <span
                          className="text-medium-dark text-uppercase"
                          style={{ fontSize: ".55rem" }}
                        >
                          {fav.parentMenu}
                        </span>{" "}
                        <br />
                      </>
                    )}
                    <i className={fav.icon} style={{ fontSize: "14px" }} />
                    <span className="ml--2" style={{ fontSize: ".84rem" }}>
                      {fav.subMenu}
                    </span>
                  </DropdownItem>
                </>
                // Option#2 - Need to use a funt. to redirect user to the selected page
                // & the menu doesnt close after the link is clicked
                // <span
                //   className="cursor-pointer ml-3 mb-2"
                //   onClick={() => this.props.history.push(fav.path)}
                // >
                //   <i className={fav.icon} style={{ fontSize: "13px" }} />
                //   <span className="ml-2" style={{ fontSize: ".84rem" }}>
                //     {fav.subMenu}
                //   </span>
                // </span>

                //   </NavLink>
                // </NavItem>
              );
            })
          ) : (
            <small className="text-medium-dark ml-3">No favourites added yet!</small>
          )}
        </DropdownMenu>
      </Dropdown>
    );
  }
}
