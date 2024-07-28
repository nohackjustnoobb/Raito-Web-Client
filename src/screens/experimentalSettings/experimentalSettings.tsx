import "./experimentalSettings.scss";

import { Component, ReactNode } from "react";

import Button from "../../components/button/button";
import Checkbox from "../../components/checkbox/checkbox";
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
      <div className="experimentalSettings">
        <h5>The functions below are buggy and not ready to use.</h5>
        <div className="options">
          <span>UseZoomablePlugin:</span>
          <Checkbox
            checked={settingsManager.experimentalUseZoomablePlugin}
            onChange={(v) => {
              settingsManager.experimentalUseZoomablePlugin = v;
              settingsManager.update();
            }}
          />
        </div>
        <Button outlined fullWidth onClick={() => this.props.close()}>
          Close
        </Button>
      </div>
    );
  }
}

export default makePopable(ExperimentalSettings);
