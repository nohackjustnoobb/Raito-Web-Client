import "./details.scss";

import { Component, ReactNode } from "react";

import { liveQuery, Subscription } from "dexie";
import { withTranslation, WithTranslation } from "react-i18next";

import {
  mdiBookmark,
  mdiBookmarkOffOutline,
  mdiDotsGrid,
  mdiDownload,
  mdiExportVariant,
  mdiOrderNumericAscending,
  mdiOrderNumericDescending,
  mdiViewList,
} from "@mdi/js";
import Icon from "@mdi/react";

import LazyImage from "../../components/lazyImage/lazyImage";
import TopBar from "../../components/topBar/topBar";
import settingsManager from "../../managers/settingsManager";
import db, { history } from "../../models/db";
import {
  listenToEvents,
  RaitoEvents,
  RaitoSubscription,
} from "../../models/events";
import { DetailsManga, Manga } from "../../models/manga";
import {
  formatChapterTitle,
  translate,
  wheelToScrollHorizontally,
} from "../../utils/utils";
import Download from "../download/download";
import makeSwipeable, {
  InjectedSwipeableProps,
} from "../swipeableScreen/swipeableScreen";

interface Props extends WithTranslation, InjectedSwipeableProps {
  manga: Manga;
}

interface State {
  manga: DetailsManga | null;
  extra: boolean;
  collected: boolean;
  history: history | null;
  isVertical: boolean;
  showTime: boolean;
  isDescending: boolean;
  isGrid: boolean;
}

class Details extends Component<Props, State> {
  state: State = {
    manga: null,
    extra: false,
    collected: false,
    history: null,
    isVertical: window.innerWidth < window.innerHeight,
    showTime: false,
    isDescending: true,
    isGrid: true,
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
        extra: !manga.chapters.serial.length,
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
              this.setState({ extra: true });

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
    if (elem.length && !this.state.isVertical) elem[0].scrollIntoView();
  }

  render(): ReactNode {
    const chaptersList =
      this.state.manga &&
      (this.state.extra
        ? this.state.manga.chapters.extra
        : this.state.manga.chapters.serial
      ).map((chapter) => {
        const title = chapter.title;

        return (
          <li
            key={chapter.id}
            className={
              this.state.history?.chapterId === chapter.id ? "highlighted" : ""
            }
            onClick={() => this.state.manga!.read(chapter.id)}
          >
            <p>
              {this.state.isGrid ? formatChapterTitle(title) : translate(title)}
            </p>
          </li>
        );
      });

    if (chaptersList && !this.state.isDescending) chaptersList.reverse();

    const chapters = (
      <>
        <div className="controller">
          <span
            onClick={() =>
              this.setState({ isDescending: !this.state.isDescending })
            }
          >
            <Icon
              path={
                this.state.isDescending
                  ? mdiOrderNumericDescending
                  : mdiOrderNumericAscending
              }
              size={1}
            />
          </span>
          <ul className="serialSelector">
            <div
              className={
                "background " + (this.state.extra ? "extra" : "serial")
              }
            />
            <li
              onClick={() => this.setState({ extra: false })}
              className={
                !this.state.manga?.chapters.serial.length
                  ? "disabled"
                  : this.state.extra
                  ? ""
                  : "selected"
              }
            >
              {this.props.t("serial")}
            </li>
            <li
              onClick={() => {
                if (this.state.manga?.chapters.extra.length)
                  this.setState({ extra: true });
              }}
              className={
                !this.state.manga?.chapters.extra.length
                  ? "disabled"
                  : this.state.extra
                  ? "selected"
                  : ""
              }
            >
              {this.props.t("extra")}
            </li>
          </ul>
          <span onClick={() => this.setState({ isGrid: !this.state.isGrid })}>
            <Icon
              path={this.state.isGrid ? mdiDotsGrid : mdiViewList}
              size={1}
            />
          </span>
        </div>
        <ul className={`chapters ${this.state.isGrid ? "grid" : "list"}`}>
          {chaptersList}
        </ul>
      </>
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
              <div
                className="share"
                onClick={async () => {
                  // share it
                  try {
                    await navigator.share({
                      url: `${
                        this.state.manga!.driver.server!.address
                      }share?driver=${this.state.manga!.driver.identifier}&id=${
                        this.state.manga!.id
                      }&proxy=${settingsManager.useProxy ? "1" : "0"}`,
                      title: translate(this.state.manga!.title),
                    });
                  } catch {}
                }}
              >
                <Icon path={mdiExportVariant} size={1} />
              </div>
            }
          />
          <div className="scrollable">
            <div className="thumbnail">
              {this.state.manga && (
                <LazyImage src={this.state.manga.thumbnail} />
              )}
            </div>
            <h2 className="title">
              {this.state.manga && translate(this.state.manga.title)}
            </h2>
            <ul className="author">
              {this.state.manga &&
                this.state.manga.authors.map((name) => (
                  <li key={name} onClick={() => window.search(name)}>
                    {name}
                  </li>
                ))}
            </ul>
            <div
              className="continue"
              onClick={() => this.state.manga!.continue()}
            >
              {this.state.history?.chapterTitle
                ? `${this.props.t("continue")} ${translate(
                    this.state.history.chapterTitle
                  )}`
                : this.props.t("startReading")}
            </div>
            <ul className="otherButtons">
              <li
                onClick={() => {
                  if (this.state.collected) {
                    this.state.manga?.remove();
                  } else {
                    this.state.manga?.add();
                  }
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
                onClick={() =>
                  window.stack.push(<Download manga={this.state.manga!} />)
                }
              >
                <Icon path={mdiDownload} size={1.25} />{" "}
                <span>{this.props.t("download")}</span>
              </li>
            </ul>
            <div className="divider" />
            <div className="description">
              <h3>{this.props.t("description")}</h3>
              <span>
                {this.state.manga && translate(this.state.manga.description)}
              </span>
            </div>
            <div className="divider" />
            <ul className="info" onWheel={wheelToScrollHorizontally("UL")}>
              <li>
                <span className="title">{this.props.t("genre")}</span>
                <span className="content">
                  {this.state.manga && this.state.manga.categories.length
                    ? this.state.manga.categories
                        .map((category) => this.props.t(category))
                        .join(" ")
                    : this.props.t("none")}
                </span>
              </li>
              <li className="vDivider" />
              <li>
                <span className="title">{this.props.t("status")}</span>
                <span className="content">
                  {this.props.t(
                    this.state.manga?.isEnded ? "ended" : "onGoing"
                  )}
                </span>
              </li>
              <li className="vDivider" />
              <li>
                <span className="title">{this.props.t("latest")}</span>
                <span className="content">
                  {this.state.manga && translate(this.state.manga.latest)}
                </span>
              </li>
              {this.state.manga && this.state.manga.updateTime && (
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
                      {this.state.manga.updateTime.toLocaleString(undefined, {
                        month: "2-digit",
                        day: "2-digit",
                        year: "numeric",
                      })}
                      <br />
                      {this.state.showTime &&
                        this.state.manga.updateTime.toLocaleString(undefined, {
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
                <span className="content">
                  {this.state.manga && this.state.manga.driver.identifier}
                </span>
              </li>
              <li className="vDivider" />
              <li>
                <span className="title">ID</span>
                <span className="content">
                  {this.state.manga && this.state.manga.id}
                </span>
              </li>
            </ul>
            <div className="divider" style={{ marginTop: "1rem" }} />
            {this.state.isVertical && chapters}
          </div>
        </div>
        {!this.state.isVertical && (
          <div className="rightContent">{chapters}</div>
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
