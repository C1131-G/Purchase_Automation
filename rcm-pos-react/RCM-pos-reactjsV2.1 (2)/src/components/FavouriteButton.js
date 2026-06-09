//FavouriteButton.5 zz w Context.js
import React from "react";
import { UncontrolledTooltip, UncontrolledPopover, PopoverBody } from "reactstrap";
import { Star } from "react-feather";
import { isMenuAddedToFavourites } from "../util/favouritesMenu";

import { FavouritesContext } from "../contexts/FavouritesContext";

class FavouriteButton extends React.Component {
  static contextType = FavouritesContext;

  state = {
    isStarred: false,
    favouritePopover: false,
  };

  toggleFavourite = () => {
    const { isStarred } = this.state;
    const context = this.context;

    //NOTE: below methods from the 'context' was 'undefined',
    //after adding these methods within the 'construtor' in the Admin.js fixed the issue
    if (isStarred) {
      context.removeMenuFromFavourites(window.location.href);
      this.setState({ isStarred: false });
    } else {
      if (context.addMenuToFavourites(window.location.href));
      this.setState({ isStarred: true });
    }
  };

  componentDidMount() {
    if (isMenuAddedToFavourites(window.location.href)) {
      this.setState({ isStarred: true });
    }
  }

  render() {
    let starColor = "text-orange";
    let labelColor = "text-orange";
    let label;
    if (!this.state.isStarred) {
      starColor = "text-medium-dark";
      label = "Add to Favourites";
    }
    return (
      <>
        {/* <UncontrolledTooltip placement="top" target="favouriteButton" className="text-sm">
        Add to Favourite
      </UncontrolledTooltip> */}
        {label && (
          <UncontrolledPopover
            placement="top"
            trigger="hover"
            hideArrow={false}
            target="favouriteButton"
          >
            <PopoverBody className={labelColor}>{label}</PopoverBody>
          </UncontrolledPopover>
        )}
        {/* <span className="text-red mr-2 mb-2 small">
          <i className="fa fa-bookmark" style={{fontSize: "15px"}}/> &nbsp;
        </span> */}
        <Star
          id="favouriteButton"
          size={20}
          className={starColor + " cursor-pointer mb-3 mr-3"}
          onClick={this.toggleFavourite}
        />
      </>
    );
  }
}

export default FavouriteButton;
