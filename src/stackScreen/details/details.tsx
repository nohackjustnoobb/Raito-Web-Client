import { Component, ReactNode } from "react";
import { CSSTransition } from "react-transition-group";
import { liveQuery } from "dexie";
import Icon from "@mdi/react";
import {
  mdiExportVariant,
  mdiChevronLeft,
  mdiBookmark,
  mdiBookmarkOffOutline,
} from "@mdi/js";

import { Manga, SimpleManga } from "../../models/manga";
import { listenToEvents, pushLoader } from "../../utils/utils";
import db, { history } from "../../models/db";
import RaitoEvent from "../../models/event";
import "./details.scss";
import { categories } from "../../tabScreen/libraries/libraries";
import LazyImage from "../../utils/lazyImage";

class Details extends Component<
  { manga: SimpleManga },
  {
    manga: Manga | null;
    show: boolean;
    extra: boolean;
    collected: boolean;
    history: history | null;
  }
> {
  // timeout of the transition
  timeout: number = 500;
  // reference for details
  detailsRef: HTMLElement | null = null;
  // check if transform should enabled
  isTouchOnEdge: boolean = false;

  constructor(props: { manga: SimpleManga }) {
    super(props);

    this.state = {
      manga: null,
      show: false,
      extra: false,
      collected: false,
      history: null,
    };
  }

  async componentDidMount() {
    // register for update events
    listenToEvents([RaitoEvent.screenChanged], this.forceUpdate.bind(this));

    // show loader
    pushLoader();
    const manga = await this.props.manga.getDetails();

    // check if success
    if (!manga) {
      // pop the loader
      window.stack.pop();
      return this.close();
    }

    this.setState(
      {
        manga: manga,
        show: true,
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

    // pop the loader
    window.stack.pop();
  }

  close() {
    this.setState({ show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
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
            連載
          </li>
          <li
            onClick={() => this.setState({ extra: true })}
            className={this.state.extra ? "selected" : ""}
          >
            番外
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
      <div className="detailsWrapper">
        <CSSTransition
          in={this.state.show}
          classNames="details"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div
            className="details"
            ref={(ref) => (this.detailsRef = ref)}
            onTouchStart={(event) => {
              const startX = event.changedTouches[0].pageX;
              // check if swipe from edge
              if (startX < 20) {
                this.isTouchOnEdge = true;
              }
            }}
            onTouchMove={(event) => {
              // follow the touches
              if (this.isTouchOnEdge && this.detailsRef) {
                this.detailsRef.style.transform = `translateX(${event.changedTouches[0].pageX}px)`;
              }
            }}
            onTouchEnd={(event) => {
              if (this.isTouchOnEdge) {
                this.isTouchOnEdge = false;
                const shouldClose = event.changedTouches[0].pageX > 100;

                // check if swiped 150 px
                if (shouldClose) {
                  this.close();
                }

                // reset the transform
                // DK why setTimeout is fixing the problem again
                setTimeout(() => {
                  this.detailsRef?.removeAttribute("style");

                  // add transition if no need to close
                  if (!shouldClose && this.detailsRef) {
                    this.detailsRef.style.transition = "transform 500ms";
                    setTimeout(
                      () => this.detailsRef?.removeAttribute("style"),
                      500
                    );
                  }
                });
              }
            }}
          >
            <div
              className="leftContent"
              style={isVertical ? {} : { maxWidth: "400px" }}
            >
              <div className="topBar">
                <div className="back" onClick={() => this.close()}>
                  <Icon path={mdiChevronLeft} size={1.25} />
                  <span>返回</span>
                </div>
                <div
                  className="share"
                  onClick={async () => {
                    // share it
                    try {
                      await navigator.share({
                        url: `${
                          this.state.manga!.driver.server!.address
                        }share?driver=${
                          this.state.manga!.driver.identifier
                        }&id=${this.state.manga!.id}&proxy=${
                          window.raito.settingsState.useProxy ? "1" : "0"
                        }`,
                        title: window.raito.translate(this.state.manga!.title),
                      });
                    } catch {}
                  }}
                >
                  <Icon path={mdiExportVariant} size={1} />
                </div>
              </div>
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
                      <li
                        key={name}
                        onClick={() => {
                          this.close();
                          window.setTab(2);
                          window.search(name);
                        }}
                      >
                        {name}
                      </li>
                    ))}
                </ul>
                <div
                  className="continue"
                  onClick={() => this.state.manga!.continue()}
                >
                  {this.state.history?.chapterTitle
                    ? `續看 ${window.raito.translate(
                        this.state.history.chapterTitle
                      )}`
                    : "開始閱讀"}
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
                        this.state.collected
                          ? mdiBookmarkOffOutline
                          : mdiBookmark
                      }
                      size={1.25}
                    />
                    <span>{this.state.collected ? "已收藏" : "收藏"}</span>
                  </li>
                  <li>開發中</li>
                </ul>
                <div className="divider" />
                <div className="description">
                  <h3>劇情簡介</h3>
                  <p>
                    {this.state.manga &&
                      window.raito.translate(this.state.manga.description)}
                  </p>
                </div>
                <div className="divider" />
                <ul className="info">
                  <li>
                    <span className="title">類型</span>
                    <span className="content">
                      {this.state.manga && this.state.manga.categories.length
                        ? this.state.manga.categories
                            .map((category) => categories[category])
                            .join(" ")
                        : "無"}
                    </span>
                  </li>
                  <li className="vDivider" />
                  <li>
                    <span className="title">狀態</span>
                    <span className="content">
                      {this.state.manga?.isEnd ? "完結" : "連載中"}
                    </span>
                  </li>
                  <li className="vDivider" />
                  <li>
                    <span className="title">最新話</span>
                    <span className="content">
                      {this.state.manga &&
                        window.raito.translate(this.state.manga.latest)}
                    </span>
                  </li>
                  <li className="vDivider" />
                  <li>
                    <span className="title">來源</span>
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
        </CSSTransition>
      </div>
    );
  }
}

export default Details;
