import React from "react";
import { Checkbox, Button } from "@mui/material";
import Icon from "@mdi/react";
import { mdiCogSync } from "@mdi/js";

import TabScreen from "../tabScreen";
import UserSettings from "../../stackScreen/userSettings/userSettings";
import ExperimentalSettings from "../../stackScreen/experimentalSettings/experimentalSettings";
import { listenToEvents } from "../../utils/utils";
import RaitoEvent from "../../models/event";

import "./settings.scss";
import CreateUser from "../../stackScreen/userSettings/createUser";
import OnlineStatus from "../../stackScreen/onlineStatus/onlineStatus";
import SourceServers from "../../stackScreen/sourceServers/sourceServers";

class SettingsTabState extends React.Component {
  render(): React.ReactNode {
    return (
      <div id="reset" onClick={() => window.raito.settingsState.reset()}>
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
      [RaitoEvent.settingsChanged, RaitoEvent.screenChanged],
      this.forceUpdate.bind(this)
    );
  }

  render(): React.ReactNode {
    const user = window.raito.user;

    return (
      <div id="settings">
        <div id="content">
          <h3 style={{ marginTop: 0 }}>一般設定</h3>
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
                      window.raito.user.pushLogin();
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
                value={window.raito.settingsState.theme}
                onChange={(event) => {
                  window.raito.settingsState.theme = Number(event.target.value);
                  window.raito.settingsState.update();
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
                  window.raito.settingsState.defaultDriver ??
                  window.raito.availableDrivers[0].identifier
                }
                onChange={(event) => {
                  window.raito.settingsState.defaultDriver = event.target.value;
                  window.raito.settingsState.update();
                }}
              >
                {window.raito.availableDrivers?.map((v) => (
                  <option key={v.identifier}>{v.identifier}</option>
                ))}
              </select>
            </div>
            <div className="options">
              <span>強制翻譯為繁體：</span>
              <Checkbox
                checked={window.raito.settingsState.forceTranslate}
                onChange={(_, checked) => {
                  window.raito.settingsState.forceTranslate = checked;
                  window.raito.settingsState.update();
                }}
              />
            </div>

            <div className="options">
              <span>格式化章節標題：</span>
              <Checkbox
                checked={window.raito.settingsState.formatChapterTitle}
                onChange={(_, checked) => {
                  window.raito.settingsState.formatChapterTitle = checked;
                  window.raito.settingsState.update();
                }}
              />
            </div>

            <div className="options">
              <span>顯示開發者設定：</span>
              <Checkbox
                checked={window.raito.settingsState.showDeveloperSettings}
                onChange={(_, checked) => {
                  window.raito.settingsState.showDeveloperSettings = checked;
                  window.raito.settingsState.update();
                }}
              />
            </div>
          </div>

          <h3>閱讀器設定</h3>
          <div className="subSettings">
            <div className="options">
              <span>漫畫排版：</span>
              <select
                value={window.raito.settingsState.displayMode}
                onChange={(event) => {
                  window.raito.settingsState.displayMode = Number(
                    event.target.value
                  );
                  window.raito.settingsState.update();
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
                  window.raito.settingsState.overscrollToLoadPreviousChapters
                }
                onChange={(_, checked) => {
                  window.raito.settingsState.overscrollToLoadPreviousChapters =
                    checked;
                  window.raito.settingsState.update();
                }}
              />
            </div>
          </div>

          <h3>伺服器設定</h3>
          <div className="subSettings">
            <div className="options">
              <span>來源狀態：</span>
              <Button
                variant={"outlined"}
                size="small"
                onClick={() => window.stack.push(<OnlineStatus />)}
              >
                查看狀態
              </Button>
            </div>
            <div className="options">
              <span>來源伺服器：</span>
              <Button
                variant={"outlined"}
                size="small"
                onClick={() => window.stack.push(<SourceServers />)}
              >
                管理界面
              </Button>
            </div>
            <div className="options">
              <span>使用代理：</span>
              <Checkbox
                checked={window.raito.settingsState.useProxy}
                onChange={(_, checked) => {
                  window.raito.settingsState.useProxy = checked;
                  window.raito.settingsState.update();
                }}
              />
            </div>
          </div>

          {window.raito.settingsState.showDeveloperSettings && (
            <>
              <h3>開發者設定</h3>
              <div className="subSettings">
                <div className="options">
                  <span>創建用戶：</span>
                  <Button
                    variant={"outlined"}
                    size="small"
                    onClick={() => window.stack.push(<CreateUser />)}
                  >
                    創建介面
                  </Button>
                </div>

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
                    checked={window.raito.settingsState.ignoreError}
                    onChange={(_, checked) => {
                      window.raito.settingsState.ignoreError = checked;
                      window.raito.settingsState.update();
                    }}
                  />
                </div>

                <div className="options">
                  <span>除錯模式：</span>
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

          <h3>版本</h3>
          <div className="subSettings">
            <div className="options">
              <span>同步伺服器版本：</span>
              <b>{window.raito.syncServer.version}</b>
            </div>
            <div className="options">
              <span>客戶端版本：</span>
              <b>{process.env.REACT_APP_VERSION}</b>
            </div>
          </div>
        </div>
        <p id="credit">
          This application is released under the MIT license. (
          <a
            href="https://github.com/nohackjustnoobb/Raito-Web-Client"
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
    );
  }
}

const Settings: TabScreen = {
  tab: <SettingsTab />,
  tabState: <SettingsTabState />,
  name: "設定",
};

export default Settings;
