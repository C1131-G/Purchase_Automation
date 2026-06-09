import routes from "../routes.js";

/** Returns the list of Favourite menu items */
const getFavourites = () => {
  let favourites = [];
  if (localStorage.getItem("Favourites")) {
    favourites = JSON.parse(localStorage.getItem("Favourites"));
  }
  return favourites;
};

/** Checks if the current screen has been added to 'Favourites' */
const isMenuAddedToFavourites = (url) => {
  const favourites = getFavourites();
  const filteredMenu = favourites.find((fav) => url.indexOf(fav.path) !== -1);
  if (filteredMenu) return true;
  else return false;
};

/**
 * Adds the selected menu to Favourites and returns the updated array
 * @param {String} url
 */
const addMenuToFavourites = (url) => {
  if (url) {
    let favourites = getFavourites();
    let menu = getMenuDetails(url);
    if (menu) {
      favourites.push(menu);
    }
    console.log("favourites: " + JSON.stringify(favourites));
    if (Array.isArray(favourites) && favourites.length > 0) {
      localStorage.setItem("Favourites", JSON.stringify(favourites));
      return favourites;
    }
  }
};

/**
 * Adds the selected menu to Favourites and returns the updated array
 * @param {String} url
 */
const removeMenuFromFavourites = (url) => {
  let favourites = getFavourites();
  let index = -1;
  if (Array.isArray(favourites) && favourites.length > 0) {
    //v1. get the index of the current 'url' in the 'favourites'
    /*for(let i = 0; i < favourites.length-1; i++) {
      if(url.indexOf(favourites[i].path) !== -1) {
        index = i;
        break;
      }
    }*/

    // get the index of the current 'url' in the 'favourites'
    index = favourites.findIndex((fav) => url.indexOf(fav.path) !== -1);
    favourites.splice(index, 1);
    console.log("favourites: " + JSON.stringify(favourites));
    localStorage.setItem("Favourites", JSON.stringify(favourites));
  }
  return favourites;
};

/** Returns the 'route' that contains the url of the screen that user wants to add to Favourites */
const getMenuDetails = (url) => {
  let menu;
  let selectedMenu;
  for (let i = 0; i < routes.length - 1; i++) {
    if (routes[i].children) {
      menu = routes[i].children.find((subMenu) => {
        return url.indexOf(subMenu.layout + subMenu.path) !== -1;
      });
    } else {
      if (url.indexOf(routes[i].layout + routes[i].path) !== -1) {
        menu = { ...routes[i] };
      }
    }
    if (menu) {
      selectedMenu = {
        parentMenu: routes[i].children ? routes[i].name : "",
        subMenu: menu.name,
        icon: menu.icon,
        path: menu.layout + menu.path,
      };
      break;
    }
  }
  return selectedMenu;
};

export { getFavourites, isMenuAddedToFavourites, addMenuToFavourites, removeMenuFromFavourites };
