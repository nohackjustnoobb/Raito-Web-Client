import { Component, ReactNode } from "react";
import { Checkbox, Button } from "@mui/material";
import { CSSTransition } from "react-transition-group";
import "./experimentalSettings.scss";

class ExperimentalSettings extends Component<{}, { show: boolean }> {
  timeout: number = 500;

  constructor(props: {}) {
    super(props);

    this.state = {
      show: false,
    };
  }

  componentDidMount() {
    window.FUM.register(this.forceUpdate.bind(this));
    this.setState({ show: true });
  }

  close() {
    this.setState({ show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
  }

  render(): ReactNode {
    return (
      <div className="experimentalSettingsWrapper">
        <CSSTransition
          in={this.state.show}
          classNames="experimentalSettings"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div className="experimentalSettings">
            <div className="background" onClick={() => this.close()} />
            <div className="userSettingsContent">
              <h5>The functions below are buggy and not ready to use.</h5>
              <div className="options">
                <span>UseZoomableComponent:</span>
                <Checkbox
                  checked={
                    window.BMA.settingsState.experimentalUseZoomableComponent
                  }
                  onChange={(_, checked) => {
                    window.BMA.settingsState.experimentalUseZoomableComponent =
                      checked;
                    window.BMA.settingsState.update();
                  }}
                />
              </div>
              <div className="options">
                <span>OverscrollToLoadPreviousEpisodes:</span>
                <Checkbox
                  checked={
                    window.BMA.settingsState
                      .experimentalOverscrollToLoadPreviousEpisodes
                  }
                  onChange={(_, checked) => {
                    window.BMA.settingsState.experimentalOverscrollToLoadPreviousEpisodes =
                      checked;
                    window.BMA.settingsState.update();
                  }}
                />
              </div>
              <div className="options">
                <span>SwipeDownToPopDetails:</span>
                <Checkbox
                  checked={
                    window.BMA.settingsState.experimentalSwipeDownToPopDetails
                  }
                  onChange={(_, checked) => {
                    window.BMA.settingsState.experimentalSwipeDownToPopDetails =
                      checked;
                    window.BMA.settingsState.update();
                  }}
                />
              </div>
              <Button
                variant={"outlined"}
                size="small"
                fullWidth
                onClick={() => this.close()}
              >
                close
              </Button>
            </div>
          </div>
        </CSSTransition>
      </div>
    );
  }
}

export default ExperimentalSettings;
