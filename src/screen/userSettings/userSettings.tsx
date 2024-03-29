import "./userSettings.scss";

import { Component, ReactNode } from "react";

import { CSSTransition } from "react-transition-group";

import { Button } from "@mui/material";

import db from "../../models/db";
import ChangePassword from "./changePassword";
import ClearData from "./clearData";

class UserSettings extends Component<{}, { show: boolean }> {
  timeout: number = 500;

  constructor(props: {}) {
    super(props);

    this.state = {
      show: false,
    };
  }

  componentDidMount() {
    this.setState({ show: true });
  }

  close() {
    this.setState({ show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
  }

  render(): ReactNode {
    const user = window.raito.user;

    return (
      <div className="userSettingsWrapper">
        <CSSTransition
          in={this.state.show}
          classNames="userSettings"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div className="userSettings">
            <div className="background" onClick={() => this.close()} />
            <div className="userSettingsContent">
              <span className="email">
                帳戶：<b>{user.email}</b>
              </span>
              <span>
                <Button
                  variant="contained"
                  color="secondary"
                  size="small"
                  fullWidth
                  onClick={() => window.stack.push(<ChangePassword />)}
                >
                  更改密碼
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color="secondary"
                  fullWidth
                  onClick={async () => {
                    localStorage.removeItem("lastSync");

                    // sync the data without timestamp
                    window.showLoader();
                    await window.raito.sync();
                    window.hideLoader();
                  }}
                >
                  同步所有數據
                </Button>
              </span>
              <span>
                <Button
                  variant={"outlined"}
                  color="error"
                  size="small"
                  fullWidth
                  onClick={async () => {
                    if (
                      window.confirm(
                        "確定要刪除所有本地數據並與服務器重新同步？"
                      )
                    ) {
                      // delete all data and sync the data
                      window.showLoader();
                      localStorage.removeItem("lastSync");
                      await db.collections.clear();
                      await db.history.clear();
                      await window.raito.sync();
                      window.hideLoader();
                    }
                  }}
                >
                  刪除本地數據
                </Button>
                <Button
                  variant={"outlined"}
                  color="error"
                  size="small"
                  fullWidth
                  onClick={() => window.stack.push(<ClearData />)}
                >
                  刪除所有數據
                </Button>
              </span>

              <span className="logout">
                <Button
                  variant={"outlined"}
                  color="error"
                  size="small"
                  fullWidth
                  onClick={() => {
                    if (window.confirm("確認登出？")) {
                      user.logout();
                      this.close();
                    }
                  }}
                >
                  登出
                </Button>
              </span>
            </div>
          </div>
        </CSSTransition>
      </div>
    );
  }
}

export default UserSettings;
