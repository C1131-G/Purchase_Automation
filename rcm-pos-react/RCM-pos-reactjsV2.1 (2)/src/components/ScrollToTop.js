import React from "react";
import { Button } from "reactstrap";

import "../assets/css/custom-style.scss";

class ScrollToTop extends React.Component {
  constructor(props) {
    super(props);
    this._isMounted = false;
    this.state = {
      isVisible: false,
    };
  }

  toggleVisibility = () => {
    /**
     * Added cond. to check Component "mounted" status to fix below warning
     * BUT IT DID NOT WORK!!!
     *    Warning: Can't perform a React state update on an unmounted component.
     *    This is a no-op, but it indicates a memory leak in your application.
     *    To fix, cancel all subscriptions and asynchronous tasks in the componentWillUnmount method.
     */
    if (this._isMounted) {
      let isVisible = false;
      if (window.pageYOffset > 150) {
        isVisible = true;
      }
      this.setState({ isVisible });
    }
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount = () => {
    this._isMounted = true;
    var scrollComponent = this;
    document.addEventListener("scroll", (event) => {
      scrollComponent.toggleVisibility();
    });
  };

  scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  render() {
    return (
      <>
        {this.state.isVisible && (
          <div className="scroll donot-printme" onClick={() => this.scrollToTop()}>
            <span className="arrow-up">
              <i className="fa fa-arrow-up text-white" />
            </span>
          </div>
        )}
      </>
    );
  }
}

export default ScrollToTop;
