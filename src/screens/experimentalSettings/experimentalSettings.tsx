import "./experimentalSettings.scss";

import { Component, ReactNode } from "react";

import { CSSTransition } from "react-transition-group";

import { Button, Checkbox } from "@mui/material";

import settingsManager from "../../managers/settingsManager";
import {
  listenToEvents,
  RaitoEvents,
  RaitoSubscription,
} from "../../models/events";

class ExperimentalSettings extends Component<{}, { show: boolean }> {
  timeout: number = 500;
  raitoSubscription: RaitoSubscription | null = null;
  state = {
    show: false,
  };

  componentDidMount() {
    this.raitoSubscription = listenToEvents(
      [RaitoEvents.settingsChanged],
      this.forceUpdate.bind(this)
    );

    this.setState({ show: true });
  }

  close() {
    this.setState({ show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
  }

  componentWillUnmount() {
    if (this.raitoSubscription) this.raitoSubscription.unsubscribe();
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
                  checked={settingsManager.experimentalUseZoomablePlugin}
                  onChange={(_, checked) => {
                    settingsManager.experimentalUseZoomablePlugin = checked;
                    settingsManager.update();
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
