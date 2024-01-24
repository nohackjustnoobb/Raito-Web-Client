import { Component, ReactNode } from "react";
import { CSSTransition } from "react-transition-group";
import Icon from "@mdi/react";
import { mdiPlus, mdiChevronLeft } from "@mdi/js";
import { Button } from "@mui/material";

import "./manageServers.scss";
import RaitoEvent from "../../models/event";
import { listenToEvents } from "../../utils/utils";
import AddServerConfig from "./addServerConfig";

class ManageServers extends Component<{}, { show: boolean }> {
  // timeout of the transition
  timeout: number = 500;
  // reference for manageServers
  manageServersRef: HTMLElement | null = null;
  // check if transform should enabled
  isTouchOnEdge: boolean = false;

  constructor(props: {}) {
    super(props);

    this.state = {
      show: false,
    };
  }

  componentDidMount() {
    this.setState({ show: true });

    // register for update events
    listenToEvents([RaitoEvent.settingsChanged], this.forceUpdate.bind(this));
  }

  close() {
    this.setState({ show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
  }

  render(): ReactNode {
    return (
      <div className="manageServersWrapper">
        <CSSTransition
          in={this.state.show}
          classNames="manageServers"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div
            className="manageServers"
            ref={(ref) => (this.manageServersRef = ref)}
            onTouchStart={(event) => {
              const startX = event.changedTouches[0].pageX;
              // check if swipe from edge
              if (startX < 20) {
                this.isTouchOnEdge = true;
              }
            }}
            onTouchMove={(event) => {
              // follow the touches
              if (this.isTouchOnEdge && this.manageServersRef) {
                this.manageServersRef.style.transform = `translateX(${event.changedTouches[0].pageX}px)`;
              }
            }}
            onTouchEnd={(event) => {
              if (this.isTouchOnEdge) {
                this.isTouchOnEdge = false;
                const shouldClose = event.changedTouches[0].pageX > 100;

                // check if swiped 150 px
                if (shouldClose) {
                  this.close();
                }

                // reset the transform
                // DK why setTimeout is fixing the problem again
                setTimeout(() => {
                  this.manageServersRef?.removeAttribute("style");

                  // add transition if no need to close
                  if (!shouldClose && this.manageServersRef) {
                    this.manageServersRef.style.transition = "transform 500ms";
                    setTimeout(
                      () => this.manageServersRef?.removeAttribute("style"),
                      500
                    );
                  }
                });
              }
            }}
          >
            <div className="topBar">
              <div className="back" onClick={() => this.close()}>
                <Icon path={mdiChevronLeft} size={1.25} />
                <span>返回</span>
              </div>
              <div
                className="add"
                onClick={() => window.stack.push(<AddServerConfig />)}
              >
                <Icon path={mdiPlus} size={1} />
              </div>
            </div>
            <ul className="serverList">
              {window.raito.sourceServers.map((v, i) => (
                <li key={i}>
                  <div>
                    <b>伺服器位址: </b>
                    <span>{v.address}</span>
                  </div>
                  <div>
                    <b>存取密鑰: </b>
                    <span>{v.accessKey || "無"}</span>
                  </div>
                  <div>
                    <b>版本: </b>
                    <span>{v.version || "?"}</span>
                  </div>
                  <div>
                    <b>可用來源: </b>
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
                          `伺服器位址: ${v.address}\n存取密鑰: ${
                            v.accessKey || "無"
                          }`
                        )
                      }
                    >
                      複製伺服器訊息
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      fullWidth
                      disabled={v.isDefaultServer}
                      onClick={() => {
                        if (window.confirm("您確定要刪除此伺服器嗎？"))
                          v.remove();
                      }}
                    >
                      刪除
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </CSSTransition>
      </div>
    );
  }
}

export default ManageServers;
