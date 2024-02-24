import "./details.scss";

import { Component, ReactNode } from "react";

import { liveQuery } from "dexie";
import { withTranslation, WithTranslation } from "react-i18next";

import { mdiBookmark, mdiBookmarkOffOutline, mdiExportVariant } from "@mdi/js";
import Icon from "@mdi/react";

import db, { history } from "../../models/db";
import RaitoEvent from "../../models/event";
import { Manga, SimpleManga } from "../../models/manga";
import LazyImage from "../../utils/lazyImage";
import TopBar from "../../utils/topBar";
import { listenToEvents, pushLoader } from "../../utils/utils";
import makeSwipeable, {
  InjectedSwipeableProps,
} from "../swipeableScreen/swipeableScreen";

interface Props extends WithTranslation, InjectedSwipeableProps {
  manga: SimpleManga;
}

class Details extends Component<
  Props,
  {
    manga: Manga | null;
    extra: boolean;
    collected: boolean;
    history: history | null;
  }
> {
  constructor(props: Props) {
    super(props);

    this.state = {
      manga: null,
      extra: false,
      collected: false,
      history: null,
    };
  }

  async componentDidMount() {
    // register for update events
    listenToEvents([RaitoEvent.screenChanged], this.forceUpdate.bind(this));

    const manga = await this.props.manga.getDetails();

    this.setState(
      {
        manga: manga,
        extra: !Boolean(manga.chapters.serial.length),
      },
      () => {
        // setup observers for current manga state
        liveQuery(() =>
          db.collections.get({
            driver: this.state.manga!.driver.identifier,
            id: this.state.manga!.id,
          })
        ).subscribe((result) => this.setState({ collected: Boolean(result) }));

        liveQuery(() =>
          db.history.get({
            driver: this.state.manga!.driver.identifier,
            id: this.state.manga!.id,
          })
        ).subscribe((result) => {
          this.setState({ history: result ?? null });
        });
      }
    );
  }

  render(): ReactNode {
    const isVertical = window.innerWidth < window.innerHeight;

    const chapters = (
      <>
        <ul className="serialSelector">
          <div
            className={"background " + (this.state.extra ? "extra" : "serial")}
          />
          <li
            onClick={() => this.setState({ extra: false })}
            className={this.state.extra ? "" : "selected"}
          >
            {this.props.t("serial")}
          </li>
          <li
            onClick={() => this.setState({ extra: true })}
            className={this.state.extra ? "selected" : ""}
          >
            {this.props.t("extra")}
          </li>
        </ul>
        <ul className="chapters">
          {this.state.manga &&
            (this.state.extra
              ? this.state.manga.chapters.extra
              : this.state.manga.chapters.serial
            ).map((chapter) => (
              <li
                key={chapter.id}
                className={
                  this.state.history?.chapterId === chapter.id
                    ? "highlighted"
                    : ""
                }
                onClick={() => this.state.manga!.read(chapter.id)}
              >
                <p>{window.raito.formatChapterTitle(chapter.title)}</p>
              </li>
            ))}
        </ul>
      </>
    );

    return (
      <div className="details">
        <div
          className="leftContent"
          style={isVertical ? {} : { maxWidth: "400px" }}
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
                      }&proxy=${
                        window.raito.settingsState.useProxy ? "1" : "0"
                      }`,
                      title: window.raito.translate(this.state.manga!.title),
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
              {this.state.manga &&
                window.raito.translate(this.state.manga.title)}
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
                ? `${this.props.t("continue")} ${window.raito.translate(
                    this.state.history.chapterTitle
                  )}`
                : this.props.t("startReading")}
            </div>
            <ul className="otherButtons">
              <li
                className="collect"
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
              <li>{this.props.t("developing")}</li>
            </ul>
            <div className="divider" />
            <div className="description">
              <h3>{this.props.t("description")}</h3>
              <p>
                {this.state.manga &&
                  window.raito.translate(this.state.manga.description)}
              </p>
            </div>
            <div className="divider" />
            <ul className="info">
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
                  {this.state.manga &&
                    window.raito.translate(this.state.manga.latest)}
                </span>
              </li>
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
            {isVertical && chapters}
          </div>
        </div>
        {!isVertical && <div className="rightContent">{chapters}</div>}
      </div>
    );
  }
}

export default makeSwipeable(withTranslation()(Details), async (props: any) => {
  // load manga
  pushLoader();
  const manga: boolean = await props.manga.getDetails();
  window.stack.pop();

  return manga;
});
