import "./userSettings.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { Button } from "@mui/material";

import TopBar from "../../components/topBar/topBar";
import db from "../../models/db";
import syncManager from "../../managers/syncManager";
import user from "../../models/user";
import makeSwipeable, {
  InjectedSwipeableProps,
} from "../swipeableScreen/swipeableScreen";
import ChangePassword from "./changePassword";
import ClearData from "./clearData";

interface Props extends InjectedSwipeableProps, WithTranslation {}

class UserSettings extends Component<Props> {
  async componentDidMount() {
    await user.getInfo();
    this.forceUpdate();
  }

  render(): ReactNode {
    const options: any = {
      month: "long",
      day: "2-digit",
      year: "numeric",
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
    };

    return (
      <div className="userSettings">
        <TopBar close={this.props.close} />
        <div className="subSettings info">
          {user.id && (
            <div className="item">
              <span>ID:</span>
              <b>{user.id}</b>
            </div>
          )}
          <div className="item">
            <span>{this.props.t("email")}:</span>
            <b>{user.email}</b>
          </div>
          {user.createdAt && (
            <div className="item">
              <span>{this.props.t("createdAt")}:</span>
              <b>{user.createdAt.toLocaleString(undefined, options)}</b>
            </div>
          )}
          {user.updatedAt && (
            <div className="item">
              <span>{this.props.t("updatedAt")}:</span>
              <b>{user.updatedAt.toLocaleString(undefined, options)}</b>
            </div>
          )}
        </div>

        <div className="subSettings">
          <Button
            variant="text"
            size="small"
            fullWidth
            onClick={() => window.stack.push(<ChangePassword />)}
          >
            {this.props.t("changePassword")}
          </Button>
          <Button
            variant="text"
            size="small"
            fullWidth
            onClick={async () => {
              localStorage.removeItem("lastSync");

              // sync the data without timestamp
              window.showLoader();
              await syncManager.sync();
              window.hideLoader();
            }}
          >
            {this.props.t("syncAllData")}
          </Button>
        </div>

        <div className="subSettings">
          <Button
            variant="text"
            color="error"
            size="small"
            fullWidth
            onClick={async () => {
              if (window.confirm(this.props.t("deleteLocalDataConfirmation"))) {
                // delete all data and sync the data
                window.showLoader();
                localStorage.removeItem("lastSync");
                await db.collections.clear();
                await db.history.clear();
                await syncManager.sync();
                window.hideLoader();
              }
            }}
          >
            {this.props.t("deleteLocalData")}
          </Button>
          <Button
            variant="text"
            color="error"
            size="small"
            fullWidth
            onClick={() => window.stack.push(<ClearData />)}
          >
            {this.props.t("deleteAllData")}
          </Button>
        </div>

        <div className="subSettings">
          <Button
            variant={"text"}
            color="error"
            size="small"
            fullWidth
            onClick={() => {
              if (window.confirm(this.props.t("logoutConfirmation"))) {
                user.logout();
                this.props.close();
              }
            }}
          >
            {this.props.t("logout")}
          </Button>
        </div>
      </div>
    );
  }
}

export default makeSwipeable(withTranslation()(UserSettings));
