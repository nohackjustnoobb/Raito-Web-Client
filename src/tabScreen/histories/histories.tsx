import TabScreen from "../tabScreen";
import React from "react";
import Icon from "@mdi/react";
import { mdiCloudSync, mdiBookArrowRight } from "@mdi/js";
import { liveQuery } from "dexie";

import db, { history } from "../../classes/db";
import "./histories.scss";
import { convertRemToPixels, pushLoader } from "../../utils/utils";
import { Manga } from "../../classes/manga";

class HistoriesTabState extends React.Component {
  interval: NodeJS.Timeout | null = null;
  FUMID: number | null = null;

  componentDidMount() {
    // register for update events
    this.FUMID = window.FUM.register(this.forceUpdate.bind(this));

    // update every second
    this.interval = setInterval(() => this.forceUpdate(), 1000);
  }

  componentWillUnmount() {
    if (this.interval) clearInterval(this.interval);
    if (this.FUMID) window.FUM.unregister(this.FUMID);
  }

  render(): React.ReactNode {
    return (
      <div
        id="sync"
        onClick={() => {
          if (!window.BMA.user.token) return alert("未登錄");
          window.BMA.sync();
        }}
      >
        <div>
          <Icon path={mdiCloudSync} size={0.75} />
          <span>同步</span>
        </div>
        {window.BMA.syncState.currentState ? (
          <p>{window.BMA.syncState.currentState}</p>
        ) : (
          window.BMA.syncState.lastSync && (
            <p>
              同步於{" "}
              {Math.round((Date.now() - window.BMA.syncState.lastSync) / 1000)}{" "}
              秒前
            </p>
          )
        )}
      </div>
    );
  }
}

class HistoriesTab extends React.Component<
  {},
  { histories: Array<history>; showImage: boolean; limit: number }
> {
  interval: NodeJS.Timeout | null = null;
  content: HTMLDivElement | null = null;
  FUMID: number | null = null;

  constructor(props: {}) {
    super(props);

    this.state = {
      histories: [],
      showImage: false,
      limit: 20,
    };
  }

  componentDidMount() {
    // register for update events
    this.FUMID = window.FUM.register(this.forceUpdate.bind(this));

    // trace for histories changes
    liveQuery(() =>
      db.histories.filter((history) => history.episode !== null).toArray()
    ).subscribe((result) => this.setState({ histories: result }));

    // sync every minute
    window.BMA.sync();
    this.interval = setInterval(() => window.BMA.sync(), 30000);
  }

  componentWillUnmount() {
    if (this.interval) clearInterval(this.interval);
    if (this.FUMID) window.FUM.unregister(this.FUMID);
  }

  componentDidUpdate(): void {
    if (window.tabIndex === 1 && !this.state.showImage) {
      this.setState({ showImage: true }, () => this.shouldLoadMore());
    }
  }

  shouldLoadMore() {
    if (!this.content) return;
    const element = this.content;

    // check if reached the bottom or not scrollable
    if (
      element.scrollHeight - element.scrollTop === element.clientHeight ||
      (window.innerWidth > window.innerHeight &&
        element.clientHeight < window.innerHeight - convertRemToPixels(5))
    ) {
      this.setState({ limit: this.state.limit + 20 }, () => {
        if (this.state.limit < this.state.histories.length)
          this.shouldLoadMore();
      });
    }
  }

  render(): React.ReactNode {
    const histories = this.state.histories
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, this.state.limit);

    return (
      <div id="histories">
        {this.state.histories.length === 0 && (
          <div id="empty">
            <p>沒有歴史</p>
          </div>
        )}
        <div
          id="historiesWrapper"
          onScroll={() => this.shouldLoadMore()}
          ref={(ref) => (this.content = ref)}
        >
          <div id="historiesContent">
            {histories.map((history) => {
              const date = new Date(history.datetime);

              return (
                <div
                  className="history"
                  key={`${history.id}_${history.driver}`}
                >
                  {this.state.showImage && (
                    <img
                      src={history.thumbnail}
                      alt=""
                      onClick={async () => {
                        pushLoader();
                        // load manga
                        const manga = await Manga.fromID(
                          history.id,
                          history.driver
                        );

                        // pop the loader
                        window.stack.pop();
                        // show details
                        manga.pushDetails();
                      }}
                    />
                  )}
                  <div className="info">
                    <h3>{window.BMA.translate(history.title)}</h3>
                    <h4>
                      上次看到 {window.BMA.translate(history.episode!)} 第
                      {history.page}頁
                    </h4>
                    <h5>更新到 {window.BMA.translate(history.latest)}</h5>
                    {window.BMA.settingsState.debugMode && (
                      <div className="debugInfo">
                        <h5>
                          {history.driver} <i>#{history.id}</i>
                        </h5>
                        <h5>{date.toLocaleString("en-GB")}</h5>
                      </div>
                    )}
                  </div>

                  <div
                    className="continue"
                    onClick={async () => {
                      pushLoader();
                      // load manga
                      const manga = await Manga.fromID(
                        history.id,
                        history.driver
                      );

                      // pop the loader
                      window.stack.pop();
                      // show details
                      manga.continue();
                    }}
                  >
                    <Icon path={mdiBookArrowRight} size={1.5} />
                    續看
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
}

const Histories: TabScreen = {
  tab: <HistoriesTab />,
  tabState: <HistoriesTabState />,
  name: "歴史",
};

export default Histories;
