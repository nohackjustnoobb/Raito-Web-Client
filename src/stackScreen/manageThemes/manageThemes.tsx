import { Component, ReactNode } from "react";
import { CSSTransition } from "react-transition-group";
import Icon from "@mdi/react";
import { mdiPlus, mdiChevronLeft } from "@mdi/js";
import { Button, Checkbox } from "@mui/material";

import "./manageThemes.scss";
import RaitoEvent from "../../models/event";
import { listenToEvents } from "../../utils/utils";
import AddThemeConfig from "./addThemeConfig";

class ManageThemes extends Component<{}, { show: boolean }> {
  // timeout of the transition
  timeout: number = 500;
  // reference for manageThemes
  manageThemesRef: HTMLElement | null = null;
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
      <div className="manageThemesWrapper">
        <CSSTransition
          in={this.state.show}
          classNames="manageThemes"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div
            className="manageThemes"
            ref={(ref) => (this.manageThemesRef = ref)}
            onTouchStart={(event) => {
              const startX = event.changedTouches[0].pageX;
              // check if swipe from edge
              if (startX < 20) {
                this.isTouchOnEdge = true;
              }
            }}
            onTouchMove={(event) => {
              // follow the touches
              if (this.isTouchOnEdge && this.manageThemesRef) {
                this.manageThemesRef.style.transform = `translateX(${event.changedTouches[0].pageX}px)`;
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
                  this.manageThemesRef?.removeAttribute("style");

                  // add transition if no need to close
                  if (!shouldClose && this.manageThemesRef) {
                    this.manageThemesRef.style.transition = "transform 500ms";
                    setTimeout(
                      () => this.manageThemesRef?.removeAttribute("style"),
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
                onClick={() => window.stack.push(<AddThemeConfig />)}
              >
                <Icon path={mdiPlus} size={1} />
              </div>
            </div>
            {window.raito.settingsState.themes.length ? (
              <ul className="themes">
                {window.raito.settingsState.themes.map((v, i) => (
                  <li key={i}>
                    <div>
                      <b>主題名稱: </b>
                      <span>{v.name}</span>
                    </div>
                    <div>
                      <b>啟用: </b>
                      <Checkbox
                        checked={
                          window.raito.settingsState.currentTheme === v.name
                        }
                        onChange={(_, checked) => {
                          window.raito.settingsState.currentTheme = checked
                            ? v.name
                            : null;

                          window.raito.settingsState.update();
                        }}
                      />
                    </div>
                    <div className="options">
                      <Button
                        variant="contained"
                        size="small"
                        color="secondary"
                        fullWidth
                        onClick={() => navigator.clipboard.writeText(v.style)}
                      >
                        複製主題CSS
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        fullWidth
                        onClick={() => {
                          if (
                            window.raito.settingsState.currentTheme === v.name
                          )
                            window.raito.settingsState.currentTheme = null;
                          window.raito.settingsState.themes =
                            window.raito.settingsState.themes.filter(
                              (theme) => theme.name !== v.name
                            );

                          window.raito.settingsState.update(true);
                        }}
                      >
                        刪除
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty">無主題配置</div>
            )}
          </div>
        </CSSTransition>
      </div>
    );
  }
}

export default ManageThemes;
