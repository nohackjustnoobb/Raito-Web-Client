import "./loader.scss";

import { Component } from "react";

import { Translation } from "react-i18next";
import { InfinitySpin } from "react-loader-spinner";

class Loader extends Component<{}, { show: boolean }> {
  state = {
    show: false,
  };

  componentDidMount() {
    window.showLoader = () => this.setState({ show: true });
    window.hideLoader = () => this.setState({ show: false });
  }

  render() {
    return (
      <div id="loader" style={{ display: this.state.show ? "flex" : "none" }}>
        <div>
          <InfinitySpin width="200" color="var(--color-text)" />
          <Translation>{(t) => <>{t("loading")}</>}</Translation>
        </div>
      </div>
    );
  }
}

export default Loader;
