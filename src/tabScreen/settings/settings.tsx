import React from "react";
import { Checkbox, Button } from "@mui/material";
import Icon from "@mdi/react";
import { mdiCogSync } from "@mdi/js";

import TabScreen from "../tabScreen";
import UserSettings from "../../stackScreen/user_settings/userSettings";
import ExperimentalSettings from "../../stackScreen/experimental_settings/experimentalSettings";
import { listenToEvents } from "../../utils/utils";
import BetterMangaAppEvent from "../../classes/event";

import "./settings.scss";

class SettingsTabState extends React.Component {
  render(): React.ReactNode {
    return (
      <div id="reset" onClick={() => window.BMA.settingsState.reset()}>
        <Icon path={mdiCogSync} size={0.75} />
        <span>重設</span>
      </div>
    );
  }
}

class SettingsTab extends React.Component {
  componentDidMount(): void {
    // register for update events
    listenToEvents(
      [BetterMangaAppEvent.settingsChanged, BetterMangaAppEvent.screenChanged],
      this.forceUpdate.bind(this)
    );
  }

  render(): React.ReactNode {
    const user = window.BMA.user;

    return (
      <div id="settings">
        <div id="content">
          <h3>一般設定</h3>
          <div className="subSettings">
            <div className="options">
              <span>
                帳戶：<b>{user.email ?? "未登錄"}</b>
              </span>
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    if (user.token) {
                      window.stack.push(<UserSettings />);
                    } else {
                      window.BMA.user.pushLogin();
                    }
                  }}
                >
                  {user.token ? "帳戶設定" : "登錄"}
                </Button>
              </span>
            </div>
            <div className="options">
              <span>深色模式：</span>
              <select
                value={window.BMA.settingsState.theme}
                onChange={(event) => {
                  window.BMA.settingsState.theme = Number(event.target.value);
                  window.BMA.settingsState.save();
                  window.updateRoot();
                }}
              >
                <option value={0}>自動</option>
                <option value={1}>深色</option>
                <option value={2}>淺色</option>
              </select>
            </div>
            <div className="options">
              <span>預設來源：</span>
              <select
                value={
                  window.BMA.settingsState.defaultDriver ??
                  window.BMA.availableDrivers[0].identifier
                }
                onChange={(event) => {
                  window.BMA.settingsState.defaultDriver = event.target.value;
                  window.BMA.settingsState.update();
                }}
              >
                {window.BMA.availableDrivers?.map((v) => (
                  <option key={v.identifier}>{v.identifier}</option>
                ))}
              </select>
            </div>
            <div className="options">
              <span>強制翻譯為繁體：</span>
              <Checkbox
                checked={window.BMA.settingsState.forceTranslate}
                onChange={(_, checked) => {
                  window.BMA.settingsState.forceTranslate = checked;
                  window.BMA.settingsState.update();
                }}
              />
            </div>
          </div>

          <h3>閱讀器設定</h3>
          <div className="subSettings">
            <div className="options">
              <span>漫畫排版：</span>
              <select
                value={window.BMA.settingsState.displayMode}
                onChange={(event) => {
                  window.BMA.settingsState.displayMode = Number(
                    event.target.value
                  );
                  window.BMA.settingsState.update();
                }}
              >
                <option value={0}>自動</option>
                <option value={1}>單頁</option>
                <option value={2}>雙頁</option>
              </select>
            </div>
            <div className="options">
              <span>下拉加載上一話：</span>
              <Checkbox
                checked={
                  window.BMA.settingsState.overscrollToLoadPreviousChapters
                }
                onChange={(_, checked) => {
                  window.BMA.settingsState.overscrollToLoadPreviousChapters =
                    checked;
                  window.BMA.settingsState.update();
                }}
              />
            </div>
          </div>
          <h3>其他設定</h3>
          <div className="subSettings">
            <div className="options">
              <span>實驗性功能：</span>
              <Button
                variant={"outlined"}
                size="small"
                onClick={() => window.stack.push(<ExperimentalSettings />)}
              >
                功能選單
              </Button>
            </div>

            <div className="options">
              <span>忽略錯誤：</span>
              <Checkbox
                checked={window.BMA.settingsState.ignoreError}
                onChange={(_, checked) => {
                  window.BMA.settingsState.ignoreError = checked;
                  window.BMA.settingsState.update();
                }}
              />
            </div>

            <div className="options">
              <span>開發者模式：</span>
              <Checkbox
                checked={window.BMA.settingsState.debugMode}
                onChange={(_, checked) => {
                  window.BMA.settingsState.debugMode = checked;
                  window.BMA.settingsState.update();
                }}
              />
            </div>
          </div>

          <h3>版本</h3>
          <div className="subSettings">
            <div className="options">
              <span>伺服器版本：</span>
              <b>{window.BMA.version}</b>
            </div>
            <div className="options">
              <span>客戶端版本：</span>
              <b>{process.env.REACT_APP_VERSION}</b>
            </div>
          </div>
        </div>
        <p id="credit">
          This application is released under the MIT license as open source. (
          <a
            href="https://github.com/nohackjustnoobb/Better-Manga-Web-Client"
            target={"_blank"}
            rel="noreferrer"
          >
            Source
          </a>
          )
          <br />
          Develop By
          <a
            href="https://github.com/nohackjustnoobb"
            target={"_blank"}
            rel="noreferrer"
          >
            nohackjustnoobb
          </a>
        </p>
      </div>
    );
  }
}

const Settings: TabScreen = {
  tab: <SettingsTab />,
  tabState: <SettingsTabState />,
  name: "設定",
};

export default Settings;
