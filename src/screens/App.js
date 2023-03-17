import React from "react";
import SwipeableViews from "react-swipeable-views";
import { virtualize } from "react-swipeable-views-utils";
import { useEffect } from "react";
import Icon from "@mdi/react";
import {
  mdiRefresh,
  mdiCloudSync,
  mdiChevronDown,
  mdiDatabase,
  mdiCogSync,
} from "@mdi/js";

import "./App.css";

import Collections from "./collections/collections";
import History from "./history/history";
import Library from "./library/library";
import Settings from "./settings/settings";
import { forceUpdateAll, useForceUpdate } from "../util";

const tabs = {
  收藏庫: <Collections />,
  歴史: <History />,
  書庫: <Library />,
  設定: <Settings />,
};

const VirtualizeSwipeableViews = virtualize(SwipeableViews);

const slideRenderer = ({ key, index }) => {
  return (
    <div key={key} className={"tab"}>
      {Object.values(tabs)[index]}
    </div>
  );
};

const TabButtons = ({ index }) => {
  const forceUpdate = useForceUpdate();
  useEffect(() => {
    var interval = setInterval(() => forceUpdate(), 60000);
    window.forceUpdate.push(() => forceUpdate());

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabButtons = [
    <div id="update">
      <div onClick={() => window.betterMangaApp.updateCollections()}>
        <Icon path={mdiRefresh} size={0.75} />
        <p>更新</p>
      </div>
      <p>
        {window.betterMangaApp.isUpdating
          ? `更新中 ${window.betterMangaApp.updateState}`
          : `更新於 ${Math.round(
              (Date.now() - window.betterMangaApp.updateTime) / 60000
            )} 分鐘前`}
      </p>
    </div>,
    <div id="update">
      <div>
        <Icon path={mdiCloudSync} size={0.75} />
        <p>同步</p>
      </div>
      <p>{}</p>
    </div>,
    <div id="drivers">
      <Icon
        path={mdiDatabase}
        size={0.75}
        style={{ transform: ["translateX(2rem)"] }}
      />
      <select
        defaultValue={window.betterMangaApp.selectedDriver?.identifier}
        onChange={(event) => {
          window.betterMangaApp.selectedDriver =
            window.betterMangaApp.getDriver(event.target.value);
          window.init[2](true);
        }}
      >
        {window.betterMangaApp.availableDrivers?.map((v) => (
          <option key={v.identifier}>{v.identifier}</option>
        ))}
      </select>
      <Icon path={mdiChevronDown} size={0.75} />
    </div>,
    <div
      id="reset"
      onClick={() => {
        window.betterMangaApp.reset();
        forceUpdateAll();
      }}
    >
      <Icon path={mdiCogSync} size={0.75} />
      <p>重設</p>
    </div>,
  ];

  return tabButtons[index];
};

class Home extends React.Component {
  constructor(props) {
    super(props);

    this.state = { index: 0 };
  }

  componentDidMount() {
    window.addEventListener("resize", () => forceUpdateAll());
    window.addEventListener("orientationchange", () => forceUpdateAll());

    window.setPage = (page) => {
      this.setState({ index: page });
      if (window.init[page]) {
        window.init[page]();
      }
    };

    window.betterMangaApp.init();
    window.init = {};
    window.forceUpdate = [];
  }

  render() {
    const styles = {
      selected: {
        fontSize: "2rem",
        transform: ["translateY(.25rem)"],
      },
      notSelected: {
        fontSize: "1rem",
        color: "#BEBEBE",
        cursor: "pointer",
      },
    };

    return (
      <>
        <ul id="tabMenu">
          <div>
            {Object.keys(tabs).map((v, i) => (
              <li
                key={i}
                onClick={
                  i === this.state.index ? () => {} : () => window.setPage(i)
                }
                style={
                  styles[i === this.state.index ? "selected" : "notSelected"]
                }
              >
                {v}
              </li>
            ))}
          </div>
          <TabButtons index={this.state.index} />
        </ul>
        <VirtualizeSwipeableViews
          slideRenderer={slideRenderer}
          slideCount={Object.keys(tabs).length}
          index={this.state.index}
          onChangeIndex={(index) => window.setPage(index)}
          enableMouseEvents
        />
      </>
    );
  }
}

export default Home;
