import "./settings.scss";

import React from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { mdiCogSync } from "@mdi/js";
import Icon from "@mdi/react";
import { Button, Checkbox } from "@mui/material";

import TopBar from "../../components/topBar/topBar";
import { lngName } from "../../locales/i18n";
import {
  listenToEvents,
  RaitoEvents,
  RaitoSubscription,
} from "../../models/events";
import ExperimentalSettings from "../experimentalSettings/experimentalSettings";
import ManageServers from "../manageServers/manageServers";
import ManageThemes from "../manageThemes/manageThemes";
import OnlineStatus from "../onlineStatus/onlineStatus";
import makeSwipeable, {
  InjectedSwipeableProps,
} from "../swipeableScreen/swipeableScreen";
import CreateUser from "../userSettings/createUser";
import UserSettings from "../userSettings/userSettings";

interface Props extends InjectedSwipeableProps, WithTranslation {}

class Settings extends React.Component<Props> {
  raitoSubscription: RaitoSubscription | null = null;

  componentDidMount() {
    // register for update events
    this.raitoSubscription = listenToEvents(
      [RaitoEvents.settingsChanged, RaitoEvents.screenChanged],
      this.forceUpdate.bind(this)
    );
  }

  componentWillUnmount() {
    if (this.raitoSubscription) this.raitoSubscription.unsubscribe();
  }

  render(): React.ReactNode {
    const user = window.raito.user;

    return (
      <div className="settings">
        <TopBar
          close={this.props.close}
          rightComponent={
            <div
              onClick={() => {
                if (window.confirm(this.props.t("settingsResetConfirmation")))
                  window.raito.settingsState.reset();
              }}
            >
              <Icon path={mdiCogSync} size={1} />
            </div>
          }
        />
        <div className="settingsContent">
          <div className="content">
            <h3 style={{ marginTop: 0 }}>{this.props.t("generalSettings")}</h3>
            <div className="subSettings">
              <div className="options">
                <span>
                  {this.props.t("account")}:
                  <b>{user.email ?? this.props.t("notLoggedIn")}</b>
                </span>
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      if (user.token) {
                        window.stack.push(<UserSettings />);
                      } else {
                        window.raito.user.pushLogin();
                      }
                    }}
                  >
                    {this.props.t(user.token ? "settings" : "logins")}
                  </Button>
                </span>
              </div>

              <div className="options">
                <span>{this.props.t("language")}: </span>
                <select
                  value={this.props.i18n.language}
                  onChange={(event) => {
                    for (const [key, value] of Object.entries(lngName)) {
                      if (value === event.target.value) {
                        localStorage.setItem("lng", key);
                        this.props.i18n.changeLanguage(key);
                      }
                    }
                  }}
                >
                  {this.props.i18n.languages.map((v) => (
                    <option key={v}>{lngName[v]}</option>
                  ))}
                </select>
              </div>

              <div className="options">
                <span>{this.props.t("defaultSource")}: </span>
                <select
                  value={
                    window.raito.settingsState.defaultDriver ??
                    window.raito.availableDrivers[0].identifier
                  }
                  onChange={(event) => {
                    window.raito.settingsState.defaultDriver =
                      event.target.value;
                    window.raito.settingsState.update();
                  }}
                >
                  {window.raito.availableDrivers?.map((v) => (
                    <option key={v.identifier}>{v.identifier}</option>
                  ))}
                </select>
              </div>

              <div className="options">
                <span>{this.props.t("forceTranslate")}: </span>
                <Checkbox
                  checked={window.raito.settingsState.forceTranslate}
                  onChange={(_, checked) => {
                    window.raito.settingsState.forceTranslate = checked;
                    window.raito.settingsState.update();
                  }}
                />
              </div>

              <div className="options">
                <span>{this.props.t("developerMode")}: </span>
                <Checkbox
                  checked={window.raito.settingsState.showDeveloperSettings}
                  onChange={(_, checked) => {
                    window.raito.settingsState.showDeveloperSettings = checked;
                    window.raito.settingsState.update();
                  }}
                />
              </div>
            </div>
            <h3>{this.props.t("appearanceSettings")}</h3>
            <div className="subSettings">
              <div className="options">
                <span>{this.props.t("formatChaptersTitle")}: </span>
                <Checkbox
                  checked={window.raito.settingsState.formatChapterTitle}
                  onChange={(_, checked) => {
                    window.raito.settingsState.formatChapterTitle = checked;
                    window.raito.settingsState.update();
                  }}
                />
              </div>

              <div className="options">
                <span>{this.props.t("theme")}: </span>
                <Button
                  variant={"outlined"}
                  size="small"
                  onClick={() => window.stack.push(<ManageThemes />)}
                >
                  {this.props.t("settings")}
                </Button>
              </div>

              <div className="options">
                <span>{this.props.t("darkTheme")}</span>
                <select
                  value={window.raito.settingsState.themeModel}
                  onChange={(event) => {
                    window.raito.settingsState.themeModel = Number(
                      event.target.value
                    );
                    window.raito.settingsState.update();
                    window.updateRoot();
                  }}
                >
                  <option value={0}>{this.props.t("auto")}</option>
                  <option value={1}>{this.props.t("dark")}</option>
                  <option value={2}>{this.props.t("light")}</option>
                </select>
              </div>

              <div className="options">
                <span>{this.props.t("numberOfRecordPreviews")}</span>
                <select
                  value={window.raito.settingsState.numberOfRecordPreviews}
                  onChange={(event) => {
                    window.raito.settingsState.numberOfRecordPreviews = Number(
                      event.target.value
                    );
                    window.raito.settingsState.update();
                  }}
                >
                  {Array.from(Array(11), (_, i) => (
                    <option value={i * 5} key={i}>
                      {i * 5}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <h3>{this.props.t("readerSettings")}</h3>
            <div className="subSettings">
              <div className="options">
                <span>{this.props.t("mangaLayout")}: </span>
                <select
                  value={window.raito.settingsState.displayMode}
                  onChange={(event) => {
                    window.raito.settingsState.displayMode = Number(
                      event.target.value
                    );
                    window.raito.settingsState.update();
                  }}
                >
                  <option value={0}>{this.props.t("auto")}</option>
                  <option value={1}>{this.props.t("singlePage")}</option>
                  <option value={2}>{this.props.t("dualPage")}</option>
                </select>
              </div>

              <div className="options">
                <span>{this.props.t("pullToLoadPreviousChapter")}</span>
                <Checkbox
                  checked={
                    window.raito.settingsState.overscrollToLoadPreviousChapters
                  }
                  onChange={(_, checked) => {
                    window.raito.settingsState.overscrollToLoadPreviousChapters =
                      checked;
                    window.raito.settingsState.update();
                  }}
                />
              </div>

              <div className="options">
                <span>{this.props.t("snapToPage")}</span>
                <Checkbox
                  checked={window.raito.settingsState.snapToPage}
                  onChange={(_, checked) => {
                    window.raito.settingsState.snapToPage = checked;
                    window.raito.settingsState.update();
                  }}
                />
              </div>
            </div>

            <h3>{this.props.t("imageSettings")}</h3>
            <div className="subSettings">
              <div className="options">
                <span>{this.props.t("imageCacheMaxAge")}</span>
                <select
                  value={window.raito.settingsState.imageCacheMaxAge}
                  onChange={(event) => {
                    window.raito.settingsState.imageCacheMaxAge = Number(
                      event.target.value
                    );
                    window.raito.settingsState.update();
                  }}
                >
                  {Array.from(Array(8), (_, i) => (
                    <option value={i === 7 ? 31536000 : i * 3600} key={i}>
                      {this.props.t(
                        i === 0 ? "noCache" : i === 7 ? "neverExpired" : `${i}h`
                      )}
                    </option>
                  ))}
                </select>
              </div>

              <div className="options">
                <span>{this.props.t("useProxy")}: </span>
                <Checkbox
                  checked={window.raito.settingsState.useProxy}
                  onChange={(_, checked) => {
                    window.raito.settingsState.useProxy = checked;
                    window.raito.settingsState.update();
                  }}
                />
              </div>

              {window.raito.settingsState.useProxy && (
                <div className="options">
                  <span>{this.props.t("useBase64")}: </span>
                  <Checkbox
                    checked={window.raito.settingsState.useBase64}
                    onChange={(_, checked) => {
                      window.raito.settingsState.useBase64 = checked;
                      window.raito.settingsState.update();
                    }}
                  />
                </div>
              )}
            </div>

            <h3>{this.props.t("serverSettings")}</h3>
            <div className="subSettings">
              <div className="options">
                <span>{this.props.t("sourcesStatus")}: </span>
                <Button
                  variant={"outlined"}
                  size="small"
                  onClick={() => window.stack.push(<OnlineStatus />)}
                >
                  {this.props.t("checkStatus")}
                </Button>
              </div>

              <div className="options">
                <span>{this.props.t("sourceServers")}: </span>
                <Button
                  variant={"outlined"}
                  size="small"
                  onClick={() => window.stack.push(<ManageServers />)}
                >
                  {this.props.t("settings")}
                </Button>
              </div>
            </div>

            {window.raito.settingsState.showDeveloperSettings && (
              <>
                <h3>{this.props.t("developerSettings")}</h3>
                <div className="subSettings">
                  <div className="options">
                    <span>{this.props.t("createUser")}: </span>
                    <Button
                      variant={"outlined"}
                      size="small"
                      onClick={() => window.stack.push(<CreateUser />)}
                    >
                      {this.props.t("openInterface")}
                    </Button>
                  </div>

                  <div className="options">
                    <span>{this.props.t("experimentalFeatures")}</span>
                    <Button
                      variant={"outlined"}
                      size="small"
                      onClick={() =>
                        window.stack.push(<ExperimentalSettings />)
                      }
                    >
                      {this.props.t("openInterface")}
                    </Button>
                  </div>

                  <div className="options">
                    <span> {this.props.t("ignoreError")}: </span>
                    <Checkbox
                      checked={window.raito.settingsState.ignoreError}
                      onChange={(_, checked) => {
                        window.raito.settingsState.ignoreError = checked;
                        window.raito.settingsState.update();
                      }}
                    />
                  </div>

                  <div className="options">
                    <span>{this.props.t("debugMode")}: </span>
                    <Checkbox
                      checked={window.raito.settingsState.debugMode}
                      onChange={(_, checked) => {
                        window.raito.settingsState.debugMode = checked;
                        window.raito.settingsState.update();
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            <h3>{this.props.t("version")}</h3>
            <div className="subSettings">
              <div className="options">
                <span>{this.props.t("syncServerVersion")}: </span>
                <b>{window.raito.syncServer.version}</b>
              </div>

              <div className="options">
                <span>{this.props.t("clientVersion")}: </span>
                <b>{process.env.REACT_APP_VERSION}</b>
              </div>
            </div>
          </div>
          <p className="credit">
            This application is released under the MIT license. (
            <a
              href="https://github.com/nohackjustnoobb/Raito-Manga"
              target={"_blank"}
              rel="noreferrer"
            >
              Source
            </a>
            )
            <br />
            Design & Develop By
            <a
              href="https://github.com/nohackjustnoobb"
              target={"_blank"}
              rel="noreferrer"
            >
              nohackjustnoobb
            </a>
          </p>
        </div>
      </div>
    );
  }
}

export default makeSwipeable(withTranslation()(Settings));
