import "./App.scss";

import { Component } from "react";

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

import Button from "./components/button/button";
import LazyImage from "./components/lazyImage/lazyImage";
import MangaPreview, { Tag } from "./components/mangaPreview/mangaPreview";
import downloadManager from "./managers/downloadManager";
import settingsManager from "./managers/settingsManager";
import syncManager from "./managers/syncManager";
import updatesManager from "./managers/updatesManager";
import db, { Collection, Record } from "./models/db";
import { listenToEvents, RaitoEvents } from "./models/events";
import { DetailsManga, Manga } from "./models/manga";
import History from "./screens/history/history";
import Library from "./screens/library/library";
import Search from "./screens/search/search";
import Settings from "./screens/settings/settings";
import { AppIcon, translate, wheelToScrollHorizontally } from "./utils/utils";

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
      [RaitoEvents.updateCollectionsStateChanged, RaitoEvents.syncStateChanged],
      this.forceUpdate.bind(this)
    );

    setInterval(() => this.forceUpdate(), 1000);
  }

  render() {
    let status = null;

    if (updatesManager.state.isUpdating && updatesManager.state.currentState)
      status = `${this.props.t("updating")} ${
        updatesManager.state.currentState
      }`;

    if (syncManager.state.isSyncing && syncManager.state.currentStatus)
      status = this.props.t(syncManager.state.currentStatus);

    if (status === null) {
      switch (this.state.mode) {
        case StatusMode.Sync:
          if (syncManager.state.lastSync)
            status = `${this.props.t("synced")} 
          ${Math.round((Date.now() - syncManager.state.lastSync) / 1000)} 
          ${this.props.t("secondsAgo")}`;
          break;
        case StatusMode.Update:
          if (updatesManager.state.lastUpdate)
            status = `${this.props.t("updated")} 
        ${Math.round((Date.now() - updatesManager.state.lastUpdate) / 60000)} 
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

const filters = ["all", "tagUpdated", "tagEnded", "download", "notRead"];
enum Filters {
  All,
  Update,
  End,
  Download,
  NotRead,
}

class App extends Component<
  WithTranslation,
  { history: Array<Record>; collections: Array<Collection>; filter: Filters }
> {
  constructor(props: WithTranslation) {
    super(props);

    this.state = { history: [], collections: [], filter: Filters.All };
  }

  componentDidMount() {
    // register for update events
    listenToEvents([RaitoEvents.downloadChanged], this.forceUpdate.bind(this));

    // trace for histories changes
    liveQuery(() => db.history.toArray()).subscribe((result) =>
      this.setState({ history: result })
    );

    liveQuery(() => db.collections.toArray()).subscribe((result) =>
      this.setState({ collections: result })
    );
  }

  componentDidUpdate() {
    if (this.state.filter === Filters.Download && !downloadManager.tasks.length)
      this.setState({ filter: Filters.All });
  }

  render() {
    const filteredCollection = this.state.collections.filter((v) => {
      let record;
      switch (this.state.filter) {
        case Filters.End:
          return v.isEnded;
        case Filters.Update:
          record = this.state.history.find(
            (h) => h.id === v.id && h.driver === v.driver
          );
          return record?.isUpdated;
        case Filters.NotRead:
          record = this.state.history.find(
            (h) => h.id === v.id && h.driver === v.driver
          );

          return !record?.chapterId;
        default:
          return true;
      }
    });
    const filteredHistory = this.state.history.filter(
      (v) => v.chapterId !== null
    );
    const previewHistory = filteredHistory
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, settingsManager.numberOfRecordPreviews);

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
          {previewHistory.length !== 0 && (
            <ul id="historyPreview" onWheel={wheelToScrollHorizontally("UL")}>
              <li
                className="viewAll"
                onClick={() => window.stack.push(<History />)}
              >
                <Icon path={mdiClockOutline} size={1} />
              </li>
              {previewHistory.map((v) => (
                <li
                  key={`${v.driver}_${v.id}`}
                  onClick={async () => {
                    window.showLoader();
                    // load manga
                    const result = await DetailsManga.get(v.driver, v.id);

                    // pop the loader
                    window.hideLoader();

                    // show details
                    if (result) (result as Manga).pushDetails();
                    else alert(`${v.driver}${this.props.t("isDown")}`);
                  }}
                >
                  <LazyImage src={v.thumbnail} />
                  <h4>{translate(v.title)}</h4>
                  <p>{translate(`${v.chapterTitle!} / ${v.latest}`)}</p>
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
              {filters
                .filter(
                  (v) =>
                    filters.indexOf(v) !== Filters.Download ||
                    downloadManager.tasks.length
                )
                .map((v) => (
                  <li
                    key={v}
                    className={
                      this.state.filter === filters.indexOf(v) ? "selected" : ""
                    }
                    onClick={() =>
                      this.setState({ filter: filters.indexOf(v) })
                    }
                  >
                    {this.props.t(v)}
                  </li>
                ))}
            </ul>
            <div onClick={() => updatesManager.update()}>
              <Icon path={mdiRefresh} size={1.25} />
            </div>
          </div>
          {this.state.filter === Filters.Download ? (
            <ul id="downloadTasks">
              {downloadManager.tasks.map((v, i) => (
                <li key={i}>
                  <LazyImage src={v.manga.thumbnail} />
                  <div className="info">
                    <b>{translate(v.manga.title)}</b>
                    <p>
                      {this.props.t(
                        v.done ? "done" : v.started ? "downloading" : "waiting"
                      )}
                    </p>
                    <div className="options">
                      <Button
                        outlined
                        warning
                        fullWidth
                        disabled={v.started && !v.done}
                        onClick={() => downloadManager.remove(i)}
                      >
                        {this.props.t("cancel")}
                      </Button>
                      <Button
                        fullWidth
                        onClick={() => {
                          if (v.done) {
                            v.save();
                            downloadManager.remove(i);
                          } else {
                            v.showProgress();
                          }
                        }}
                        disabled={!v.started}
                      >
                        {this.props.t(v.done ? "save" : "check")}
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : filteredCollection.length === 0 ? (
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

                  const aDateTime = Math.max(
                    aHistory.datetime,
                    aHistory.updateDatetime || 0
                  );
                  const bDateTime = Math.max(
                    bHistory.datetime,
                    bHistory.updateDatetime || 0
                  );

                  return bDateTime - aDateTime;
                })
                .map((manga) => {
                  // get the history of the manga
                  const history = this.state.history.find(
                    (h) => h.id === manga.id && h.driver === manga.driver
                  );

                  const mangaObject = Manga.fromCollection(manga);
                  const tag = manga.isEnded
                    ? Tag.Ended
                    : history?.isUpdated
                    ? Tag.Updated
                    : Tag.None;

                  const historyString = (history && history.chapterTitle) || "";

                  return (
                    <MangaPreview
                      key={`${manga.id}_${manga.driver}`}
                      manga={mangaObject}
                      tag={tag}
                      history={historyString}
                    />
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
