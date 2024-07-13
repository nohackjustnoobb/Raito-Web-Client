import "./manageServers.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { mdiPlus } from "@mdi/js";
import Icon from "@mdi/react";
import { Button } from "@mui/material";

import TopBar from "../../components/topBar/topBar";
import {
  listenToEvents,
  RaitoEvents,
  RaitoSubscription,
} from "../../models/events";
import serversManager from "../../managers/serversManager";
import makeSwipeable, {
  InjectedSwipeableProps,
} from "../swipeableScreen/swipeableScreen";
import AddServerConfig from "./addServerConfig";

interface Props extends InjectedSwipeableProps, WithTranslation {}

class ManageServers extends Component<Props> {
  raitoSubscription: RaitoSubscription | null = null;

  componentDidMount() {
    // register for update events
    this.raitoSubscription = listenToEvents(
      [RaitoEvents.settingsChanged],
      this.forceUpdate.bind(this)
    );
  }

  componentWillUnmount() {
    if (this.raitoSubscription) this.raitoSubscription.unsubscribe();
  }

  render(): ReactNode {
    return (
      <div className="manageServers">
        <TopBar
          close={this.props.close}
          rightComponent={
            <div onClick={() => window.stack.push(<AddServerConfig />)}>
              <Icon path={mdiPlus} size={1} />
            </div>
          }
        />

        <ul className="serverList">
          {serversManager.servers.map((v, i) => (
            <li key={i}>
              <div>
                <b>{this.props.t("serverAddress")}: </b>
                <span>{v.address}</span>
              </div>
              <div>
                <b>{this.props.t("accessKey")}: </b>
                <span>{v.accessKey || this.props.t("none")}</span>
              </div>
              <div>
                <b>{this.props.t("version")}: </b>
                <span>{v.version || "?"}</span>
              </div>
              <div>
                <b>{this.props.t("availableSources")}: </b>
                <span>{v.availableDriver.join(", ") || "?"}</span>
              </div>
              <div className="options">
                <Button
                  variant="contained"
                  size="small"
                  color="secondary"
                  fullWidth
                  onClick={() =>
                    navigator.clipboard.writeText(
                      `${this.props.t("serverAddress")}: ${
                        v.address
                      }\n${this.props.t("accessKey")}: ${
                        v.accessKey || this.props.t("none")
                      }`
                    )
                  }
                >
                  {this.props.t("copyServerInfo")}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  fullWidth
                  disabled={v.isDefaultServer}
                  onClick={() => {
                    if (window.confirm(this.props.t("deleteConfirm")))
                      v.remove();
                  }}
                >
                  {this.props.t("delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }
}

export default makeSwipeable(withTranslation()(ManageServers));
