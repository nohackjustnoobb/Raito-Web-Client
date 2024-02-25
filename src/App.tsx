import "./App.scss";

import { Component, ReactNode } from "react";

import { liveQuery } from "dexie";
import { withTranslation, WithTranslation } from "react-i18next";

import {
  mdiBookSearch,
  mdiClockOutline,
  mdiCog,
  mdiDotsHorizontalCircleOutline,
  mdiLibraryShelves,
  mdiRefresh,
} from "@mdi/js";
import Icon from "@mdi/react";

import db, { collection, history } from "./models/db";
import RaitoEvent from "./models/event";
import { Manga, SimpleManga } from "./models/manga";
import History from "./screen/history/history";
import Library from "./screen/library/library";
import Search from "./screen/search/search";
import Settings from "./screen/settings/settings";
import LazyImage from "./utils/lazyImage";
import { AppIcon, listenToEvents, pushLoader } from "./utils/utils";

const filters = ["all", "update", "end"];

enum StatusMode {
  None,
  Sync,
  Update,
}

class Status extends Component<WithTranslation, { mode: StatusMode }> {
  state = {
    mode: StatusMode.None,
  };

  componentDidMount() {
    // register for update events
    listenToEvents(
      [RaitoEvent.updateCollectionsStateChanged, RaitoEvent.syncStateChanged],
      this.forceUpdate.bind(this)
    );

    setInterval(() => this.forceUpdate(), 1000);
  }

  render() {
    let status = null;

    if (window.raito.updateCollectionsState.isUpdating)
      status = `${this.props.t("updating")} ${
        window.raito.updateCollectionsState.currentState
      }`;

    if (window.raito.syncState.isSyncing && window.raito.syncState.currentState)
      status = this.props.t(window.raito.syncState.currentState);

    if (status === null) {
      switch (this.state.mode) {
        case StatusMode.Sync:
          if (window.raito.syncState.lastSync)
            status = `${this.props.t("synced")} 
          ${Math.round((Date.now() - window.raito.syncState.lastSync) / 1000)} 
          ${this.props.t("secondsAgo")}`;
          break;
        case StatusMode.Update:
          if (window.raito.updateCollectionsState.lastUpdate)
            status = `${this.props.t("updated")} 
        ${Math.round(
          (Date.now() - window.raito.updateCollectionsState.lastUpdate) / 60000
        )} 
        ${this.props.t("minutesAgo")}`;
          break;
      }
    }

    return (
      <div>
        <div
          className="icon"
          onClick={() =>
            this.setState({
              mode: this.state.mode === 2 ? 0 : this.state.mode + 1,
            })
          }
        >
          <AppIcon />
        </div>
        <div className="appName">
          <h2>Raito Manga</h2>
          {status && <h5>{status}</h5>}
        </div>
      </div>
    );
  }
}

class App extends Component<
  WithTranslation,
  { history: Array<history>; collections: Array<collection>; filter: string }
> {
  constructor(props: WithTranslation) {
    super(props);

    this.state = { history: [], collections: [], filter: "all" };
  }

  componentDidMount() {
    // trace for histories changes
    liveQuery(() => db.history.toArray()).subscribe((result) =>
      this.setState({ history: result })
    );

    liveQuery(() => db.collections.toArray()).subscribe((result) =>
      this.setState({ collections: result })
    );
  }

  render(): ReactNode {
    const filteredCollection = this.state.collections.filter((v) => {
      switch (this.state.filter) {
        case "update":
          const record = this.state.history.find(
            (h) => h.id === v.id && h.driver === v.driver
          );
          return record?.new;
        case "end":
          return v.isEnd;
        default:
          return true;
      }
    });
    const filteredHistory = this.state.history.filter(
      (v) => v.chapterId !== null
    );

    return (
      <div id="main">
        <div id="menuBar">
          <Status
            t={this.props.t}
            i18n={this.props.i18n}
            tReady={this.props.tReady}
          />

          <div id="actions">
            <div onClick={() => window.stack.push(<Library />)}>
              <Icon path={mdiLibraryShelves} size={1.25} />
            </div>
            <div onClick={() => window.stack.push(<Search />)}>
              <Icon path={mdiBookSearch} size={1.25} />
            </div>
            <div onClick={() => window.stack.push(<Settings />)}>
              <Icon path={mdiCog} size={1.25} />
            </div>
          </div>
        </div>
        <div id="content">
          {filteredHistory.length !== 0 && (
            <ul id="historyPreview">
              <li
                className="viewAll"
                onClick={() => window.stack.push(<History />)}
              >
                <Icon path={mdiClockOutline} size={1} />
              </li>
              {filteredHistory
                .sort((a, b) => b.datetime - a.datetime)
                .slice(0, 10)
                .map((v) => (
                  <li
                    key={`${v.driver}_${v.id}`}
                    onClick={async () => {
                      pushLoader();
                      // load manga
                      const result = await Manga.get(v.driver, v.id);

                      // pop the loader
                      window.stack.pop();

                      // show details
                      if (result) (result as SimpleManga).pushDetails();
                    }}
                  >
                    <LazyImage src={v.thumbnail} />
                    <h4>{window.raito.translate(v.title)}</h4>
                    <p>
                      {window.raito.translate(
                        `${v.chapterTitle!} / ${v.latest}`
                      )}
                    </p>
                  </li>
                ))}
              {this.state.history && (
                <li
                  className="viewAll"
                  onClick={() => window.stack.push(<History />)}
                >
                  <Icon path={mdiDotsHorizontalCircleOutline} size={1} />
                  <span>{this.props.t("more")}</span>
                </li>
              )}
            </ul>
          )}
          <div id="subMenuBar">
            <ul id="filters">
              {filters.map((v) => (
                <li
                  key={v}
                  className={this.state.filter === v ? "selected" : ""}
                  onClick={() => this.setState({ filter: v })}
                >
                  {this.props.t(v)}
                </li>
              ))}
            </ul>
            <div onClick={() => window.raito.updateCollections()}>
              <Icon path={mdiRefresh} size={1.25} />
            </div>
          </div>
          {filteredCollection.length === 0 ? (
            <div id="empty">
              <p>{this.props.t("noFavorites")}</p>
            </div>
          ) : (
            <div id="collectionsContent">
              {filteredCollection
                .sort((a, b) => {
                  // get the both history
                  const aHistory = this.state.history.find(
                    (v) => v.id === a.id && v.driver === a.driver
                  );
                  const bHistory = this.state.history.find(
                    (v) => v.id === b.id && v.driver === b.driver
                  );

                  // check if the history is existing
                  if (!aHistory || !bHistory) return 0;

                  return bHistory.datetime - aHistory.datetime;
                })
                .map((manga) => {
                  // get the history of the manga
                  const history = this.state.history.find(
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
                      {manga.isEnd && (
                        <div className="end">{this.props.t("end")}</div>
                      )}
                      {history?.new && !manga.isEnd && (
                        <div className="new">{this.props.t("update")}</div>
                      )}
                      {window.raito.settingsState.debugMode && (
                        <>
                          <div className="driverID">{manga.driver}</div>
                          <div className="mangaID">{manga.id}</div>
                        </>
                      )}
                      <LazyImage src={manga.thumbnail} />
                      <h3>{window.raito.translate(manga.title)}</h3>
                      <h5>
                        {history && history.chapterTitle
                          ? window.raito.translate(history.chapterTitle)
                          : this.props.t("notRead")}
                        {" / "}
                        {window.raito.translate(manga.latest)}
                      </h5>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default withTranslation()(App);
