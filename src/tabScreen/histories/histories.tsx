import TabScreen from "../tabScreen";
import React from "react";
import Icon from "@mdi/react";
import { mdiCloudSync, mdiBookArrowRight } from "@mdi/js";
import { liveQuery } from "dexie";

import db, { history } from "../../models/db";
import {
  convertRemToPixels,
  listenToEvents,
  pushLoader,
} from "../../utils/utils";
import { Manga } from "../../models/manga";
import RaitoEvent from "../../models/event";
import LazyImage from "../../utils/lazyImage";
import "./histories.scss";
import Driver from "../../models/driver";

class HistoriesTabState extends React.Component {
  interval: NodeJS.Timeout | null = null;

  componentDidMount() {
    // register for update events
    listenToEvents([RaitoEvent.syncStateChanged], this.forceUpdate.bind(this));

    // update every second
    this.interval = setInterval(() => this.forceUpdate(), 1000);
  }

  componentWillUnmount() {
    if (this.interval) clearInterval(this.interval);
  }

  render(): React.ReactNode {
    return (
      <div
        id="sync"
        onClick={() => {
          if (!window.raito.user.token) return alert("未登錄");
          window.raito.sync();
        }}
      >
        <div>
          <Icon path={mdiCloudSync} size={0.75} />
          <span>同步</span>
        </div>
        {window.raito.syncState.currentState ? (
          <p>{window.raito.syncState.currentState}</p>
        ) : (
          window.raito.syncState.lastSync && (
            <p>
              同步於{" "}
              {Math.round(
                (Date.now() - window.raito.syncState.lastSync) / 1000
              )}{" "}
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
    listenToEvents(
      [
        RaitoEvent.settingsChanged,
        RaitoEvent.tabChanged,
        RaitoEvent.screenChanged,
      ],
      this.forceUpdate.bind(this)
    );

    // trace for histories changes
    liveQuery(() =>
      db.history.filter((history) => history.chapterId !== null).toArray()
    ).subscribe((result) => this.setState({ histories: result }));

    // sync every minute
    this.interval = setInterval(() => this.shouldSync(), 5000);
  }

  componentWillUnmount() {
    if (this.interval) clearInterval(this.interval);
  }

  componentDidUpdate(): void {
    if (window.tabIndex === 1 && !this.state.showImage) {
      this.setState({ showImage: true }, () => this.shouldLoadMore());
    }
  }

  shouldSync() {
    if (
      window.raito.isHistoryChanged ||
      (window.raito.syncState.lastSync &&
        window.raito.syncState.lastSync + 30000 <= Date.now())
    ) {
      window.raito.sync();
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
                  <LazyImage
                    src={history.thumbnail}
                    load={this.state.showImage}
                    onClick={async () => {
                      pushLoader();
                      // load manga
                      const result = await Manga.get(
                        history.driver,
                        history.id
                      );

                      // pop the loader
                      window.stack.pop();

                      // show details
                      if (result) {
                        (result as Manga).pushDetails();
                      } else {
                        const driver = Driver.getOrCreate(history.driver);
                        if (driver && driver.isDown)
                          return alert(`${driver.identifier}來源不可用`);
                      }
                    }}
                  />

                  <div className="info">
                    <h3>{window.raito.translate(history.title)}</h3>
                    <h4>
                      上次看到 {window.raito.translate(history.chapterTitle!)}{" "}
                      第{history.page}頁
                    </h4>
                    <h5>更新到 {window.raito.translate(history.latest)}</h5>
                    {window.raito.settingsState.debugMode && (
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
                      const result = await Manga.get(
                        history.driver,
                        history.id
                      );

                      // pop the loader
                      window.stack.pop();
                      // show details
                      if (result) {
                        (result as Manga).continue();
                      } else {
                        const driver = Driver.getOrCreate(history.driver);
                        if (driver && driver.isDown)
                          return alert(`${driver.identifier}來源不可用`);
                      }
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
