import { Component, ReactNode } from "react";
import { CSSTransition } from "react-transition-group";
import Icon from "@mdi/react";
import { mdiChevronLeft, mdiStar, mdiStarOffOutline } from "@mdi/js";
import { liveQuery } from "dexie";

import "./details.scss";

import { pushLoader } from "../../utils/utils";
import { categories } from "../../tabScreen/libraries/libraries";
import db, { history } from "../../classes/db";
import { SimpleManga, Manga } from "../../classes/manga";

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
    window.FUM.register(this.forceUpdate.bind(this));

    // show loader
    pushLoader();
    const manga = await this.props.manga.getDetails();
    // get the details
    this.setState(
      {
        manga: manga,
        show: true,
        extra: !Boolean(manga.episodes.serial.length),
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
              <li key={name}>{window.BMA.translate(name)}</li>
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
        <Icon path={mdiChevronLeft} size={1.5} color={"white"} />
      </div>
    );

    const thumbnail = (
      <img
        src={this.state.manga ? this.state.manga.thumbnail : undefined}
        alt=""
        className="thumbnail"
      />
    );

    const episodes = (
      <div className="episodesWrapper">
        <div className="status">
          <h2 className="isEnd">
            {this.state.manga?.isEnd ? "完結" : "連載中"}
          </h2>
          {Boolean(this.state.manga?.episodes.extra.length) && (
            <div
              className={`extra ${this.state.extra ? "enable" : ""}`}
              onClick={() => this.setState({ extra: !this.state.extra })}
            >
              番外
            </div>
          )}
        </div>
        <ul className="episodes">
          {this.state.manga &&
            (this.state.extra
              ? this.state.manga.episodes.extra
              : this.state.manga.episodes.serial
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
            {this.state.history?.episode
              ? `續看 ${window.BMA.translate(this.state.history.episode)}`
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
                  {window.BMA.settingsState.useUnstableFeature && (
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
                  {episodes}
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
                {episodes}
              </div>
            </CSSTransition>
          </div>
        )}
      </div>
    );
  }
}

export default Details;
