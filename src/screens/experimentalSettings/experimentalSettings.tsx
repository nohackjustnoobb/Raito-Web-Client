import "./experimentalSettings.scss";

import { Component, ReactNode } from "react";

import { Button, Checkbox } from "@mui/material";

import settingsManager from "../../managers/settingsManager";
import {
  listenToEvents,
  RaitoEvents,
  RaitoSubscription,
} from "../../models/events";
import makePopable, { InjectedPopableProps } from "../popScreen/popScreen";

class ExperimentalSettings extends Component<
  InjectedPopableProps,
  { show: boolean }
> {
  raitoSubscription: RaitoSubscription | null = null;

  componentDidMount() {
    this.raitoSubscription = listenToEvents(
      [RaitoEvents.settingsChanged],
      this.forceUpdate.bind(this)
    );
  }

  componentWillUnmount() {
    if (this.raitoSubscription) this.raitoSubscription.unsubscribe();
  }

  render(): ReactNode {
    return (
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
          onClick={() => this.props.close()}
        >
          close
        </Button>
      </div>
    );
  }
}

export default makePopable(ExperimentalSettings);
