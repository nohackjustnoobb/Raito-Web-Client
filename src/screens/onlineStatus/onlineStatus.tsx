import "./onlineStatus.scss";

import { Component } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { Button } from "@mui/material";

import driversManager from "../../managers/driversManager";
import serversManager from "../../managers/serversManager";
import makePopable, { InjectedPopableProps } from "../popScreen/popScreen";

class OnlineStatus extends Component<
  WithTranslation & InjectedPopableProps,
  { isLoading: boolean }
> {
  interval: NodeJS.Timeout | null = null;
  state = {
    isLoading: false,
  };

  componentDidMount() {
    this.interval = setInterval(() => this.forceUpdate(), 1000);
  }

  componentWillUnmount() {
    if (this.interval) clearInterval(this.interval);
  }

  render() {
    return (
      <div className="onlineStatus">
        <h5>
          {this.state.isLoading
            ? this.props.t("updating")
            : serversManager.lastCheck
            ? `${this.props.t("updated")} ${Math.round(
                (Date.now() - serversManager.lastCheck!) / 1000
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
            {driversManager.available.map((driver) => (
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
                await serversManager.checkOnlineStatus(true);
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
            onClick={() => this.props.close()}
          >
            {this.props.t("close")}
          </Button>
        </span>
      </div>
    );
  }
}

export default makePopable(withTranslation()(OnlineStatus));
