import { Component, ReactNode } from "react";
import { CSSTransition } from "react-transition-group";
import Icon from "@mdi/react";
import { Tooltip } from "react-tooltip";
import { Img } from "react-image";
import {
  mdiClose,
  mdiStar,
  mdiStarOffOutline,
  mdiShareVariantOutline,
  mdiInformationSlabSymbol,
} from "@mdi/js";
import { liveQuery } from "dexie";
import { TailSpin } from "react-loader-spinner";

import { listenToEvents, pushLoader } from "../../utils/utils";
import { categories } from "../../tabScreen/libraries/libraries";
import db, { history } from "../../classes/db";
import { SimpleManga, Manga } from "../../classes/manga";
import BetterMangaAppEvent from "../../classes/event";

import "./details.scss";

class Details extends Component<
  { manga: SimpleManga },
  {
    manga: Manga | null;
    show: boolean;
    extra: boolean;
    showBackground: boolean;
    collected: boolean;
    history: history | null;
  }
> {
  timeout: number = 500;
  startY: number | null = null;
  verticalContentRef: HTMLElement | null = null;
  verticalBackgroundRef: HTMLElement | null = null;

  constructor(props: { manga: SimpleManga }) {
    super(props);

    this.state = {
      manga: null,
      show: false,
      showBackground: false,
      extra: false,
      collected: false,
      history: null,
    };
  }

  async componentDidMount() {
    // register for update events
    listenToEvents(
      [BetterMangaAppEvent.screenChanged],
      this.forceUpdate.bind(this)
    );

    // show loader
    pushLoader();
    const manga = await this.props.manga.getDetails();

    // check if success
    if (!manga) {
      // pop the loader
      window.stack.pop();
      return this.close();
    }

    // get the details
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
          db.histories.get({
            driver: this.state.manga!.driver.identifier,
            id: this.state.manga!.id,
          })
        ).subscribe((result) => this.setState({ history: result ?? null }));
      }
    );
    setTimeout(() => this.setState({ showBackground: true }), this.timeout / 2);
    // pop the loader
    window.stack.pop();
  }

  close() {
    this.setState({ showBackground: false, show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
  }

  render(): ReactNode {
    const isVertical = window.innerWidth < window.innerHeight;

    const baseInfo = (
      <div className="baseInfo">
        <ul className="categories">
          {this.state.manga &&
            this.state.manga.categories.map((category) => (
              <li key={category}>{categories[category]}</li>
            ))}
        </ul>
        <h2 className="title">
          {this.state.manga && window.BMA.translate(this.state.manga.title)}
        </h2>
        <ul className="author">
          {this.state.manga &&
            this.state.manga.author.map((name) => (
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
        <p>
          {this.state.manga &&
            window.BMA.translate(this.state.manga.description)}
        </p>
      </div>
    );

    const closeButton = (
      <div className="close" onClick={() => this.close()}>
        <Icon path={mdiClose} size={1.5} color={"white"} />
      </div>
    );

    const shareButton = (
      <div
        className="share"
        onClick={async () => {
          // construct the url
          let shareUrl = new URL(window.location.href);
          shareUrl.pathname = "/share";
          shareUrl.searchParams.append(
            "driver",
            this.state.manga!.driver.identifier
          );
          shareUrl.searchParams.append("id", this.state.manga!.id);

          // share it
          try {
            await navigator.share({
              url: shareUrl.href,
              title: window.BMA.translate(this.state.manga!.title),
            });
          } catch {}
        }}
      >
        <Icon path={mdiShareVariantOutline} size={isVertical ? 1.25 : 1} />
      </div>
    );

    const idInfo = (
      <>
        <div data-tooltip-id="idInfo" className="idInfo">
          <Icon
            path={mdiInformationSlabSymbol}
            size={isVertical ? 1.25 : 1.5}
          />
        </div>
        <Tooltip
          id="idInfo"
          render={() => (
            <div className="idInfoContent">
              <b>{this.state.manga?.driver.identifier}</b>
              <span />
              {this.state.manga?.id}
            </div>
          )}
        />
      </>
    );

    const thumbnail = this.state.manga && (
      <div className="imgWrapper">
        <Img
          src={this.state.manga.thumbnail}
          className="thumbnail"
          loader={
            isVertical ? (
              <></>
            ) : (
              <TailSpin
                height={60}
                width={60}
                color={"var(--color-chapters-text)"}
                wrapperClass="imgLoader"
                ariaLabel="tail-spin-loading"
              />
            )
          }
        />
      </div>
    );

    const chapters = (
      <div className="chaptersWrapper">
        <div className="status">
          <h2 className="isEnd">
            {this.state.manga?.isEnd ? "完結" : "連載中"}
          </h2>
          <div>
            {!isVertical && idInfo}
            {!isVertical && shareButton}
            {Boolean(this.state.manga?.chapters.extra.length) && (
              <div
                className={`extra ${this.state.extra ? "enable" : ""}`}
                onClick={() => this.setState({ extra: !this.state.extra })}
              >
                番外
              </div>
            )}
          </div>
        </div>
        <ul className="chapters">
          {this.state.manga &&
            (this.state.extra
              ? this.state.manga.chapters.extra
              : this.state.manga.chapters.serial
            ).map((name, index) => (
              <li
                key={index}
                onClick={() => this.state.manga!.read(index, this.state.extra)}
              >
                {window.BMA.translate(name)}
              </li>
            ))}
        </ul>
      </div>
    );

    const options = (
      <div className="options">
        <div
          className={this.state.collected ? "collected" : "notCollected"}
          onClick={() => {
            if (this.state.collected) {
              this.state.manga?.remove();
            } else {
              this.state.manga?.add();
            }
          }}
        >
          <Icon
            path={this.state.collected ? mdiStarOffOutline : mdiStar}
            size={1.5}
          />
        </div>
        <div className="read" onClick={() => this.state.manga!.continue()}>
          <h3>
            {this.state.history?.chapter
              ? `續看 ${window.BMA.translate(this.state.history.chapter)}`
              : "開始閱讀"}
          </h3>
        </div>
      </div>
    );

    return (
      <div className="details">
        {isVertical ? (
          <div className="vertical">
            <div className="backgroundWrapper">
              <CSSTransition
                in={this.state.showBackground}
                classNames="background"
                timeout={this.timeout / 2}
                unmountOnExit
                mountOnEnter
              >
                <div
                  className="background"
                  ref={(ref) => (this.verticalBackgroundRef = ref)}
                >
                  {closeButton}
                  <div className="leftItems">
                    {idInfo}
                    {shareButton}
                  </div>
                  {thumbnail}
                </div>
              </CSSTransition>
            </div>
            <div className="contentWrapper">
              <CSSTransition
                in={this.state.show}
                classNames="content"
                timeout={this.timeout}
                unmountOnExit
                mountOnEnter
              >
                <div
                  className="content"
                  ref={(ref) => (this.verticalContentRef = ref)}
                >
                  {window.BMA.settingsState
                    .experimentalSwipeDownToPopDetails && (
                    <>
                      <div
                        className="swipable"
                        onTouchStart={(event) => {
                          // store the start y position
                          this.startY = event.touches[0].pageY;
                        }}
                        onTouchMove={(event) => {
                          if (
                            this.startY &&
                            this.verticalContentRef &&
                            this.verticalBackgroundRef
                          ) {
                            // calculate the translate and opacity
                            const translate =
                              (event.changedTouches[0].pageY - this.startY) * 2;
                            const opacityIndex = window.innerHeight * 0.3;
                            const opacity =
                              (opacityIndex - translate) / opacityIndex;

                            if (translate < 0) return;

                            // apply the translate and opacity
                            this.verticalContentRef.style.transform = `translateY(${translate}px)`;
                            this.verticalBackgroundRef.style.opacity =
                              String(opacity);
                          }
                        }}
                        onTouchEnd={(event) => {
                          if (this.startY) {
                            const shouldClose =
                              (event.changedTouches[0].pageY - this.startY) *
                                2 >
                              200;

                            // check if swiped 200 px
                            if (shouldClose) {
                              this.close();
                            }

                            // reset start position
                            this.startY = null;
                            // reset the transform & opacity
                            // DK why setTimeout is fixing the problem again
                            setTimeout(() => {
                              this.verticalContentRef?.removeAttribute("style");
                              this.verticalBackgroundRef?.removeAttribute(
                                "style"
                              );

                              // add transition if no need to close
                              if (
                                !shouldClose &&
                                this.verticalContentRef &&
                                this.verticalBackgroundRef
                              ) {
                                this.verticalContentRef.style.transition =
                                  "transform 500ms";
                                this.verticalBackgroundRef.style.transition =
                                  "opacity 250ms";
                                setTimeout(() => {
                                  this.verticalContentRef?.removeAttribute(
                                    "style"
                                  );
                                  this.verticalBackgroundRef?.removeAttribute(
                                    "style"
                                  );
                                }, 500);
                              }
                            });
                          }
                        }}
                      />
                      <span className="closeBar" />
                    </>
                  )}
                  {baseInfo}
                  {chapters}
                  {options}
                </div>
              </CSSTransition>
            </div>
          </div>
        ) : (
          <div className="horizontalWrapper">
            <CSSTransition
              in={this.state.show}
              classNames="horizontal"
              timeout={this.timeout}
              unmountOnExit
              mountOnEnter
            >
              <div className="horizontal">
                <div className="info">
                  {closeButton}
                  {thumbnail}
                  {baseInfo}
                  {options}
                </div>
                {chapters}
              </div>
            </CSSTransition>
          </div>
        )}
      </div>
    );
  }
}

export default Details;
