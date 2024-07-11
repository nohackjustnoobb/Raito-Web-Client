import "./onlineStatus.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";
import { CSSTransition } from "react-transition-group";

import { Button } from "@mui/material";

class OnlineStatus extends Component<
  WithTranslation,
  { show: boolean; isLoading: boolean }
> {
  timeout: number = 500;
  interval: NodeJS.Timeout | null = null;
  state = {
    show: false,
    isLoading: false,
  };

  componentDidMount() {
    this.interval = setInterval(() => this.forceUpdate(), 1000);

    this.setState({ show: true });
  }

  componentWillUnmount() {
    if (this.interval) clearInterval(this.interval);
  }

  close() {
    this.setState({ show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
  }

  render(): ReactNode {
    return (
      <div className="onlineStatusWrapper">
        <CSSTransition
          in={this.state.show}
          classNames="onlineStatus"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div className="onlineStatus">
            <div className="background" onClick={() => this.close()} />
            <div className="onlineStatusContent">
              <h5>
                {this.state.isLoading
                  ? this.props.t("updating")
                  : window.raito.statusManager.lastCheck
                  ? `${this.props.t("updated")} ${Math.round(
                      (Date.now() - window.raito.statusManager.lastCheck!) /
                        1000
                    )} ${this.props.t("secondsAgo")}`
                  : this.props.t("noStatus")}
              </h5>

              <table>
                <tbody>
                  <tr>
                    <th>{this.props.t("source")}</th>
                    <th>{this.props.t("version")}</th>
                    <th>{this.props.t("online")}</th>
                    <th>{this.props.t("latency")}</th>
                  </tr>
                  {window.raito.availableDrivers.map((driver) => (
                    <tr
                      key={driver.identifier}
                      className={driver.isDown ? "disabled" : ""}
                    >
                      <td>{driver.identifier}</td>
                      <td>{driver.version || "?"}</td>
                      <td>
                        {driver.onlineStatus
                          ? driver.onlineStatus.online
                            ? "✓"
                            : "✖"
                          : "?"}
                      </td>
                      <td>
                        {driver.onlineStatus
                          ? `${driver.onlineStatus!.latency}ms`
                          : "?"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <span>
                <Button
                  variant={"contained"}
                  size="small"
                  color="secondary"
                  fullWidth
                  onClick={async () => {
                    if (!this.state.isLoading) {
                      this.setState({ isLoading: true });
                      await window.raito.statusManager.checkOnlineStatus(true);
                      this.setState({ isLoading: false });
                    }
                  }}
                >
                  {this.props.t("update")}
                </Button>
                <Button
                  variant={"outlined"}
                  size="small"
                  fullWidth
                  onClick={() => this.close()}
                >
                  {this.props.t("close")}
                </Button>
              </span>
            </div>
          </div>
        </CSSTransition>
      </div>
    );
  }
}

export default withTranslation()(OnlineStatus);
