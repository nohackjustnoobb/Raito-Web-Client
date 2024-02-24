import './history.scss';

import React from 'react';

import { liveQuery } from 'dexie';
import {
  withTranslation,
  WithTranslation,
} from 'react-i18next';

import {
  mdiBookArrowRight,
  mdiCloudSync,
  mdiPlaylistEdit,
} from '@mdi/js';
import Icon from '@mdi/react';

import db, { history } from '../../models/db';
import Driver from '../../models/driver';
import RaitoEvent from '../../models/event';
import { Manga } from '../../models/manga';
import LazyImage from '../../utils/lazyImage';
import TopBar from '../../utils/topBar';
import {
  convertRemToPixels,
  listenToEvents,
  pushLoader,
} from '../../utils/utils';
import makeSwipeable, {
  InjectedSwipeableProps,
} from '../swipeableScreen/swipeableScreen';

interface Props extends InjectedSwipeableProps, WithTranslation {}

class History extends React.Component<
  Props,
  { history: Array<history>; limit: number }
> {
  interval: NodeJS.Timeout | null = null;
  content: HTMLDivElement | null = null;

  constructor(props: Props) {
    super(props);

    this.state = {
      history: [],
      limit: 20,
    };
  }

  componentDidMount() {
    // register for update events
    listenToEvents(
      [RaitoEvent.settingsChanged, RaitoEvent.screenChanged],
      this.forceUpdate.bind(this)
    );

    // trace for history changes
    liveQuery(() =>
      db.history.filter((history) => history.chapterId !== null).toArray()
    ).subscribe((result) => this.setState({ history: result }));

    // sync every minute
    this.interval = setInterval(() => this.shouldSync(), 5000);
  }

  componentWillUnmount() {
    if (this.interval) clearInterval(this.interval);
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
        if (this.state.limit < this.state.history.length) this.shouldLoadMore();
      });
    }
  }

  render(): React.ReactNode {
    const history = this.state.history
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, this.state.limit);

    return (
      <div className="history">
        <TopBar
          close={this.props.close}
          rightComponent={
            <div className="actions">
              <div
                onClick={() => {
                  if (!window.raito.user.token)
                    return alert(this.props.t("notLoggedIn"));
                  window.raito.sync();
                }}
              >
                <Icon path={mdiCloudSync} size={1} />
              </div>
              <div onClick={() => alert("developing")}>
                <Icon path={mdiPlaylistEdit} size={1} />
              </div>
            </div>
          }
        />
        {this.state.history.length === 0 && (
          <div className="empty">
            <p>{this.props.t("noHistory")}</p>
          </div>
        )}
        <div
          className="historyWrapper"
          onScroll={() => this.shouldLoadMore()}
          ref={(ref) => (this.content = ref)}
        >
          <div className="historyContent">
            {history.map((history) => {
              const date = new Date(history.datetime);

              return (
                <div className="record" key={`${history.id}_${history.driver}`}>
                  <LazyImage
                    src={history.thumbnail}
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
                          return alert(
                            `${driver.identifier}${this.props.t("isDown")}`
                          );
                      }
                    }}
                  />

                  <div className="info">
                    <h3>{window.raito.translate(history.title)}</h3>
                    <h4>
                      {this.props.t("lastSeen")}{" "}
                      {window.raito.translate(history.chapterTitle!)}{" "}
                      {this.props.t("page1")}
                      {history.page}
                      {this.props.t("page2")}
                    </h4>
                    <h5>
                      {this.props.t("updatedTo")}{" "}
                      {window.raito.translate(history.latest)}
                    </h5>
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
                          return alert(
                            `${driver.identifier}${this.props.t("isDown")}`
                          );
                      }
                    }}
                  >
                    <Icon path={mdiBookArrowRight} size={1.5} />
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

export default makeSwipeable(withTranslation()(History));
