import { Component, ReactNode } from "react";
import SwipeableViews from "react-swipeable-views";
import { virtualize } from "react-swipeable-views-utils";

import TabScreen from "./tabScreen/tabScreen";
import "./App.scss";
import RaitoEvent from "./models/event";
import { dispatchEvent } from "./utils/utils";

// Tabs
import Collections from "./tabScreen/collections/collections";
import Histories from "./tabScreen/histories/histories";
import Libraries from "./tabScreen/libraries/libraries";
import Settings from "./tabScreen/settings/settings";

// declare SwipeableView for tabs
const VirtualizeSwipeableViews = virtualize(SwipeableViews);

class App extends Component<{}, { tabIndex: number; enable: boolean }> {
  // All the tabs are added here
  static readonly tabs: Array<TabScreen> = [
    Collections,
    Histories,
    Libraries,
    Settings,
  ];

  constructor(props: {}) {
    super(props);

    this.state = {
      // Tabs Index
      tabIndex: 0,
      enable: true,
    };
  }

  componentDidMount(): void {
    // set global variable for changing the tabs index
    window.setTab = (index: number): void => this.setState({ tabIndex: index });
    window.toggleTab = (enable: boolean): void =>
      this.setState({ enable: enable });
    this.forceUpdate();
  }

  componentDidUpdate(): void {
    window.tabIndex = this.state.tabIndex;
    dispatchEvent(RaitoEvent.tabChanged);
  }

  render(): ReactNode {
    return (
      <>
        <ul id="tabMenu">
          <div>
            {App.tabs.map((tabScreen, index) => (
              <li
                key={index}
                onClick={
                  index === this.state.tabIndex
                    ? () => {}
                    : () => window.setTab(index)
                }
                className={
                  index === this.state.tabIndex ? "selected" : "notSelected"
                }
              >
                {tabScreen.name}
              </li>
            ))}
          </div>
          {App.tabs[this.state.tabIndex].tabState}
        </ul>
        <VirtualizeSwipeableViews
          slideRenderer={({ key, index }) => (
            <div key={key} className="tab">
              {App.tabs[index].tab}
            </div>
          )}
          slideCount={App.tabs.length}
          index={this.state.tabIndex}
          onChangeIndex={(index) => window.setTab(index)}
          enableMouseEvents
          resistance
          disabled={!this.state.enable}
          ignoreNativeScroll
        />
      </>
    );
  }
}

export default App;
