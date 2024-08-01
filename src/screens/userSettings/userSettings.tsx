import './userSettings.scss';

import { Component } from 'react';

import {
  withTranslation,
  WithTranslation,
} from 'react-i18next';

import { mdiFormTextboxPassword } from '@mdi/js';

import Button from '../../components/button/button';
import TopBar from '../../components/topBar/topBar';
import syncManager from '../../managers/syncManager';
import db from '../../models/db';
import user from '../../models/user';
import InputPopup from '../inputPopup/inputPopup';
import makeSwipeable, {
  InjectedSwipeableProps,
} from '../swipeableScreen/swipeableScreen';

class UserSettings extends Component<InjectedSwipeableProps & WithTranslation> {
  async componentDidMount() {
    await user.getInfo();
    this.forceUpdate();
  }

  render() {
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
            fullWidth
            horizontalPadding={0.5}
            textColor="var(--color-text)"
            backgroundColor="transparent"
            onClick={() =>
              window.stack.push(
                <InputPopup
                  title={this.props.t("changePassword")}
                  values={[
                    {
                      value: "oldPassword",
                      placeholder: this.props.t("oldPassword"),
                      type: "password",
                      autoComplete: "current-password",
                    },
                    {
                      value: "newPassword",
                      placeholder: this.props.t("newPassword"),
                      type: "password",
                      autoComplete: "new-password",
                    },
                  ]}
                  onSubmit={async (v, close, clear) => {
                    window.showLoader();
                    const result = await user.changePassword(
                      v["newPassword"],
                      v["oldPassword"]
                    );
                    window.hideLoader();

                    if (result) {
                      close();
                    } else {
                      clear(["oldPassword"]);
                      alert(this.props.t("wrongPassword"));
                    }
                  }}
                />
              )
            }
          >
            {this.props.t("changePassword")}
          </Button>
          <Button
            fullWidth
            horizontalPadding={0.5}
            textColor="var(--color-text)"
            backgroundColor="transparent"
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
            textColor="var(--color-warning)"
            backgroundColor="transparent"
            fullWidth
            horizontalPadding={0.5}
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
            textColor="var(--color-warning)"
            backgroundColor="transparent"
            fullWidth
            horizontalPadding={0.5}
            onClick={() =>
              window.stack.push(
                <InputPopup
                  title={this.props.t("deleteAllData")}
                  values={[
                    {
                      value: "password",
                      placeholder: this.props.t("oldPassword"),
                      type: "password",
                      autoComplete: "current-password",
                      leftIcon: mdiFormTextboxPassword,
                    },
                  ]}
                  onSubmit={async (v, close, clear) => {
                    if (!window.confirm(this.props.t("clearDataConfirmation")))
                      return;

                    window.showLoader();
                    const result = await user.clear(v["password"]);
                    window.hideLoader();

                    if (result) {
                      close();
                    } else {
                      clear(["password"]);
                      alert(this.props.t("wrongPassword"));
                    }
                  }}
                />
              )
            }
          >
            {this.props.t("deleteAllData")}
          </Button>
        </div>

        <div className="subSettings">
          <Button
            textColor="var(--color-warning)"
            backgroundColor="transparent"
            fullWidth
            horizontalPadding={0.5}
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
