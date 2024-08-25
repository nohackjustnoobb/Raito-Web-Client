import './details.scss';

import {
  Component,
  ReactNode,
} from 'react';

import {
  liveQuery,
  Subscription,
} from 'dexie';
import {
  withTranslation,
  WithTranslation,
} from 'react-i18next';

import {
  mdiBookmark,
  mdiBookmarkOffOutline,
  mdiDownload,
  mdiExportVariant,
} from '@mdi/js';
import Icon from '@mdi/react';

import ChaptersList from '../../components/chaptersList/chaptersList';
import LazyImage from '../../components/lazyImage/lazyImage';
import TopBar from '../../components/topBar/topBar';
import settingsManager from '../../managers/settingsManager';
import db, { Record } from '../../models/db';
import {
  listenToEvents,
  RaitoEvents,
  RaitoSubscription,
} from '../../models/events';
import {
  DetailsManga,
  Manga,
} from '../../models/manga';
import {
  translate,
  wheelToScrollHorizontally,
} from '../../utils/utils';
import Download from '../download/download';
import makeSwipeable, {
  InjectedSwipeableProps,
} from '../swipeableScreen/swipeableScreen';

interface Props extends WithTranslation, InjectedSwipeableProps {
  manga: Manga;
}

interface State {
  manga: DetailsManga | null;
  extraSelected: boolean;
  collected: boolean;
  history: Record | null;
  isVertical: boolean;
  showTime: boolean;
  isDescending: boolean;
}

class Details extends Component<Props, State> {
  state: State = {
    manga: null,
    extraSelected: false,
    collected: false,
    history: null,
    isVertical: window.innerWidth < window.innerHeight,
    showTime: false,
    isDescending: true,
  };
  collectionsSubscription: Subscription | null = null;
  historySubscription: Subscription | null = null;
  raitoSubscription: RaitoSubscription | null = null;

  async componentDidMount() {
    // register for update events
    this.raitoSubscription = listenToEvents([RaitoEvents.screenChanged], () => {
      const isVertical = window.innerWidth < window.innerHeight;
      if (isVertical !== this.state.isVertical)
        this.setState({ isVertical: isVertical });
    });

    const manga = await this.props.manga.getDetails();

    this.setState(
      {
        manga: manga,
        extraSelected: !manga.chapters.serial.length,
      },
      () => {
        // setup observers for current manga state
        this.collectionsSubscription = liveQuery(() =>
          db.collections.get({
            driver: this.state.manga!.driver.identifier,
            id: this.state.manga!.id,
          })
        ).subscribe((result) => this.setState({ collected: Boolean(result) }));

        this.historySubscription = liveQuery(() =>
          db.history.get({
            driver: this.state.manga!.driver.identifier,
            id: this.state.manga!.id,
          })
        ).subscribe((result) => {
          if (result && this.state.history?.chapterId !== result.chapterId) {
            if (
              this.state.history === null &&
              this.state.manga?.chapters.extra.find(
                (v) => v.id === result.chapterId
              )
            )
              this.setState({ extraSelected: true });

            this.setState({ history: result }, () =>
              this.scrollToHighlighted()
            );
          }
        });
      }
    );
  }

  componentWillUnmount() {
    if (this.collectionsSubscription)
      this.collectionsSubscription.unsubscribe();

    if (this.historySubscription) this.historySubscription.unsubscribe();

    if (this.raitoSubscription) this.raitoSubscription.unsubscribe();
  }

  scrollToHighlighted() {
    const elem = document.getElementsByClassName("highlighted");
    if (elem.length && !this.state.isVertical)
      elem[0].scrollIntoView({ block: "nearest" });
  }

  render(): ReactNode {
    const manga = this.state.manga;
    const chaptersList = manga && (
      <ChaptersList
        manga={manga}
        highlighted={
          this.state.history?.chapterId ? [this.state.history.chapterId] : []
        }
        onClick={(id) => manga!.read(id)}
        safeArea={{ top: !this.state.isVertical, bottom: true }}
      />
    );

    return (
      <div className="details">
        <div
          className="leftContent"
          style={this.state.isVertical ? {} : { maxWidth: "400px" }}
        >
          <TopBar
            close={this.props.close}
            rightComponent={
              (!manga?.driver.server?.accessKey || undefined) && (
                <div
                  className="share"
                  onClick={async () => {
                    // share it
                    try {
                      await navigator.share({
                        url: `${manga!.driver.server!.address}share?driver=${
                          manga!.driver.identifier
                        }&id=${manga!.id}&proxy=${
                          settingsManager.useProxy ? "1" : "0"
                        }`,
                        title: translate(manga!.title),
                      });
                    } catch {}
                  }}
                >
                  <Icon path={mdiExportVariant} size={1} />
                </div>
              )
            }
          />
          <div className="scrollable">
            <div className="thumbnail">
              {manga && <LazyImage src={manga.thumbnail} />}
            </div>
            <h2 className="title">{manga && translate(manga.title)}</h2>
            <ul className="author">
              {manga &&
                manga.authors.map((name) => (
                  <li key={name} onClick={() => window.search(name)}>
                    {name}
                  </li>
                ))}
            </ul>
            <div className="continue" onClick={() => manga!.continue()}>
              {this.props.t(
                this.state.history?.chapterTitle ? "continue" : "startReading"
              )}
              <span>
                {this.state.history?.chapterTitle &&
                  translate(this.state.history.chapterTitle)}
              </span>
            </div>
            <ul className="otherButtons">
              <li
                onClick={() => {
                  if (this.state.collected) manga?.remove();
                  else manga?.add();
                }}
              >
                <Icon
                  path={
                    this.state.collected ? mdiBookmarkOffOutline : mdiBookmark
                  }
                  size={1.25}
                />
                <span>
                  {this.props.t(this.state.collected ? "added" : "add")}
                </span>
              </li>
              <li
                onClick={() => window.stack.push(<Download manga={manga!} />)}
              >
                <Icon path={mdiDownload} size={1.25} />{" "}
                <span>{this.props.t("download")}</span>
              </li>
            </ul>
            <div className="divider" />
            <div className="description">
              <h3>{this.props.t("description")}</h3>
              <span>{manga && translate(manga.description)}</span>
            </div>
            <div className="divider" />
            <ul className="info" onWheel={wheelToScrollHorizontally("UL")}>
              <li>
                <span className="title">{this.props.t("genre")}</span>
                <span className="content">
                  {manga && manga.genres.length
                    ? manga.genres.map((genre) => this.props.t(genre)).join(" ")
                    : this.props.t("none")}
                </span>
              </li>
              <li className="vDivider" />
              <li>
                <span className="title">{this.props.t("status")}</span>
                <span className="content">
                  {this.props.t(manga?.isEnded ? "ended" : "onGoing")}
                </span>
              </li>
              <li className="vDivider" />
              <li>
                <span className="title">{this.props.t("latest")}</span>
                <span className="content">
                  {manga && translate(manga.latest)}
                </span>
              </li>
              {manga && manga.updateTime && (
                <>
                  <li className="vDivider" />
                  <li
                    onClick={() =>
                      this.setState({ showTime: !this.state.showTime })
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <span className="title">{this.props.t("updateTime")}</span>
                    <span className="content">
                      {manga.updateTime.toLocaleString(undefined, {
                        month: "2-digit",
                        day: "2-digit",
                        year: "numeric",
                      })}
                      <br />
                      {this.state.showTime &&
                        manga.updateTime.toLocaleString(undefined, {
                          hour12: true,
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                    </span>
                  </li>
                </>
              )}

              <li className="vDivider" />
              <li>
                <span className="title">{this.props.t("source")}</span>
                <span className="content selectable">
                  {manga && manga.driver.identifier}
                </span>
              </li>
              <li className="vDivider" />
              <li>
                <span className="title">ID</span>
                <span className="content selectable">{manga && manga.id}</span>
              </li>
            </ul>
            <div
              className="divider"
              style={{
                marginTop: "1rem",
                marginBottom: this.state.isVertical ? "0" : "1rem",
              }}
            />
            {this.state.isVertical && chaptersList}
          </div>
        </div>
        {!this.state.isVertical && (
          <div className="rightContent">{chaptersList}</div>
        )}
      </div>
    );
  }
}

export default makeSwipeable(withTranslation()(Details), async (props: any) => {
  // load manga
  window.showLoader();
  const manga: boolean = await props.manga.getDetails();
  window.hideLoader();

  return manga;
});
