import React from "react";
import Icon from "@mdi/react";
import { mdiRefresh } from "@mdi/js";
import { liveQuery } from "dexie";

import "./collections.scss";
import TabScreen from "../tabScreen";
import db, { collection, history } from "../../classes/db";
import { SimpleManga } from "../../classes/manga";

class CollectionsTabState extends React.Component {
  interval: NodeJS.Timeout | null = null;

  componentDidMount() {
    // register for update events
    window.FUM.register(this.forceUpdate.bind(this));

    // update every minute
    this.interval = setInterval(() => this.forceUpdate(), 60000);
  }

  componentWillUnmount() {
    if (this.interval) clearInterval(this.interval);
  }

  render(): React.ReactNode {
    return (
      <div id="update" onClick={() => window.BMA.updateCollections()}>
        <div>
          <Icon path={mdiRefresh} size={0.75} />
          <span>更新</span>
        </div>
        {window.BMA.updateCollectionsState.isUpdating
          ? window.BMA.updateCollectionsState.currentState && (
              <p>更新中 {window.BMA.updateCollectionsState.currentState}</p>
            )
          : window.BMA.updateCollectionsState.lastUpdate && (
              <p>
                更新於{" "}
                {Math.round(
                  (Date.now() - window.BMA.updateCollectionsState.lastUpdate) /
                    60000
                )}{" "}
                分鐘前
              </p>
            )}
      </div>
    );
  }
}

class CollectionsTab extends React.Component<
  {},
  { collections: Array<collection>; histories: Array<history> }
> {
  constructor(props: {}) {
    super(props);

    this.state = {
      collections: [],
      histories: [],
    };
  }

  componentDidMount() {
    // register for update events
    window.FUM.register(this.forceUpdate.bind(this));

    // setup observers for history and collection
    liveQuery(() => db.collections.toArray()).subscribe((result) =>
      this.setState({ collections: result })
    );

    liveQuery(() => db.histories.toArray()).subscribe((result) =>
      this.setState({ histories: result })
    );

    // update the collection
    window.BMA.updateCollections();
  }

  render(): React.ReactNode {
    return (
      <div id="collections">
        {this.state.collections.length === 0 && (
          <div id="empty">
            <p>沒有收藏</p>
          </div>
        )}
        <div id="collectionsWrapper">
          <div id="collectionsContent">
            {this.state.collections
              .sort((a, b) => {
                // get the both history
                const aHistory = this.state.histories.find(
                  (v) => v.id === a.id && v.driver === a.driver
                );
                const bHistory = this.state.histories.find(
                  (v) => v.id === b.id && v.driver === b.driver
                );

                // check if the history is existing
                if (!aHistory || !bHistory) return 0;

                return bHistory.datetime - aHistory.datetime;
              })
              .map((manga) => {
                // get the history of the manga
                const history = this.state.histories.find(
                  (h) => h.id === manga.id && h.driver === manga.driver
                );

                return (
                  <div
                    key={`${manga.id}_${manga.driver}`}
                    className="collection"
                    onClick={() =>
                      SimpleManga.fromCollection(manga).pushDetails()
                    }
                  >
                    {manga.isEnd && <div className="end">完結</div>}
                    {history?.new && !manga.isEnd && (
                      <div className="new">更新</div>
                    )}
                    {window.BMA.settingsState.debugMode && (
                      <>
                        <div className="driverID">{manga.driver}</div>
                        <div className="mangaID">{manga.id}</div>
                      </>
                    )}
                    <img src={manga.thumbnail} alt="" />
                    <h3>{window.BMA.translate(manga.title)}</h3>
                    <h5>
                      {history &&
                        window.BMA.translate(history?.episode ?? "未看")}
                      {" / "}
                      {window.BMA.translate(manga.latest)}
                    </h5>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  }
}

const Collections: TabScreen = {
  tab: <CollectionsTab />,
  tabState: <CollectionsTabState />,
  name: "收藏庫",
};

export default Collections;
