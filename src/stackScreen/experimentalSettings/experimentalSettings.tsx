import { Component, ReactNode } from "react";
import { Checkbox, Button } from "@mui/material";
import { CSSTransition } from "react-transition-group";

import { listenToEvents } from "../../utils/utils";
import RaitoEvent from "../../models/event";

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
    listenToEvents([RaitoEvent.settingsChanged], this.forceUpdate.bind(this));

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
                <span>UseZoomablePlugin:</span>
                <Checkbox
                  checked={
                    window.raito.settingsState.experimentalUseZoomablePlugin
                  }
                  onChange={(_, checked) => {
                    window.raito.settingsState.experimentalUseZoomablePlugin =
                      checked;
                    window.raito.settingsState.update();
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
