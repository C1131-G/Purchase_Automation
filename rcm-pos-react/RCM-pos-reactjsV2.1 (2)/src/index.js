//index.6 b4 Rel. Notes _Modal.js
import React from "react";
import ReactDOM from "react-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import "assets/plugins/nucleo/css/nucleo.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "assets/scss/argon-dashboard-react.scss";
import "assets/scss/react-data-table.scss";
import "assets/scss/argon-dashboard/custom/_tn-custom-radio.scss";

import "react-bootstrap-typeahead/css/Typeahead.css";
import "assets/css/custom-style.scss";
import "assets/css/fixed-header.scss";
import "assets/css/print.css";
import "assets/css/popover.scss";
import "assets/css/table-sort.scss";
import "./assets/css/custom-style-2.scss";
import "./assets/css/custom-lib-styles.scss";

import { Toast, ToastBody, ToastHeader } from "reactstrap";

import BrowserRoutes from "./browserRoutes";
import ClearCache from "react-clear-cache";
import "./@mock-api";

import register from "./serviceWorker";

//Create a query client
const queryClient = new QueryClient();

ReactDOM.render(
  <>
    <ClearCache>
      {({ isLatestVersion, emptyCacheStorage }) => (
        <>
          {/* show the blurred overlay when displaying the Popup */}
          {!isLatestVersion && <div class="overlay-blur" />}

          {/* Product Update popup */}
          <Toast className="toast center-middle mt-20" isOpen={!isLatestVersion}>
            <div className="toast-header toast-danger text-white">
              <strong className="mr-auto ">
                <i className="fa fa-info-circle" /> &nbsp;Product Update
              </strong>
              {/* <button
                type="button"
                className="ml-2 close"
                data-dismiss="toast"
                aria-label="Close"
                onClick={undefined}
                >
                <span aria-hidden="true">×</span>
              </button> */}
            </div>
            <ToastBody className="text-white text-left toast-body">
              <span className="text-danger mr-10">
                New version available! &nbsp;
                <b
                  style={{ cursor: "pointer", textDecoration: "underline" }}
                  onClick={(e) => {
                    e.preventDefault();
                    emptyCacheStorage();
                    window.location.reload();
                  }}
                >
                  Click
                </b>
                &nbsp;to update!
              </span>
            </ToastBody>
          </Toast>
          {/* } */}
        </>
      )}
    </ClearCache>
    {/* Provide the client to your App */}
    <QueryClientProvider client={queryClient}>
      <BrowserRoutes />
    </QueryClientProvider>
  </>,
  document.getElementById("root"),
);

/** Added for Hot Module Replacement (HMR) */
if (module.hot) {
  module.hot.accept("./browserRoutes", () => {
    const NextApp = require("./browserRoutes").default;
    ReactDOM.render(
      <QueryClientProvider client={queryClient}>
        <NextApp />
      </QueryClientProvider>,
      document.getElementById("root"),
    );
  });
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
register();
