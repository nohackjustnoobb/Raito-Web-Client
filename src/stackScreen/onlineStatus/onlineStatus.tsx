import { Component, ReactNode } from "react";
import { Button } from "@mui/material";
import { CSSTransition } from "react-transition-group";

import "./onlineStatus.scss";

class OnlineStatus extends Component<
  {},
  { show: boolean; isLoading: boolean }
> {
  timeout: number = 500;

  constructor(props: {}) {
    super(props);

    this.state = {
      show: false,
      isLoading: false,
    };
  }

  componentDidMount() {
    setInterval(() => this.forceUpdate(), 1000);

    this.setState({ show: true });
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
                  ? "更新中"
                  : window.raito.lastCheckOnDriverStatus
                  ? `更新於 ${Math.round(
                      (Date.now() - window.raito.lastCheckOnDriverStatus!) /
                        1000
                    )} 秒前`
                  : "未更新來源狀態"}
              </h5>

              <table>
                <tr>
                  <th>來源</th>
                  <th>版本</th>
                  <th>在線</th>
                  <th>延遲</th>
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
                      await window.raito.checkOnlineStatus(true);
                      this.setState({ isLoading: false });
                    }
                  }}
                >
                  更新
                </Button>
                <Button
                  variant={"outlined"}
                  size="small"
                  fullWidth
                  onClick={() => this.close()}
                >
                  關閉
                </Button>
              </span>
            </div>
          </div>
        </CSSTransition>
      </div>
    );
  }
}

export default OnlineStatus;
