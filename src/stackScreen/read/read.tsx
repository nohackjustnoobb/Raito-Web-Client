import { Component, Fragment, ReactNode } from "react";
import { CSSTransition } from "react-transition-group";
import Icon from "@mdi/react";
import { mdiWindowClose } from "@mdi/js";
import { Pressable, Space, ViewPort } from "react-zoomable-ui";

import "./read.scss";

import { pushLoader } from "../../utils/utils";

import { DisplayMode } from "../../classes/settingsState";
import { Manga } from "../../classes/manga";
import Menu from "./menu";

class Warning extends Component<{ noNextOne: boolean }> {
  constructor(props: { noNextOne: boolean }) {
    super(props);

    setTimeout(() => window.stack.pop(), 1000);
  }

  render(): ReactNode {
    return (
      <div className="warning">
        <div className="warningContainer">
          <Icon path={mdiWindowClose} size={3} />
          <h2>{this.props.noNextOne ? "沒有下一話了" : "沒有上一話了"}</h2>
        </div>
      </div>
    );
  }
}

class Read extends Component<
  {
    manga: Manga;
    episodesIndex: number;
    isExtra: boolean;
    page?: number | null;
  },
  {
    show: boolean;
    menu: boolean;
    page: number | null;
    index: number | null;
    pageOffset: boolean;
    episodesUrls: { [index: number]: Array<string> };
  }
> {
  // timeout of the transition
  timeout: number = 500;
  // timeout of detecting double or single click
  timeoutId: NodeJS.Timeout | null = null;
  // counter for counting clicks
  counter: number = 0;
  // viewPoint for space
  viewPoint: ViewPort | null = null;
  // reference for container
  containerRef: HTMLElement | null = null;
  // reference for read
  readRef: HTMLElement | null = null;
  // state for loading
  loading: boolean = false;
  // cache for previous height
  prevHeight: number | null = null;
  // use to slow down the moveby
  inCooldown: boolean = false;
  // store image that is wider
  wideImage: Array<string> = [];
  // check if transform should enabled
  startX: boolean = false;
  // detect if ready
  ready: boolean = false;

  constructor(props: {
    manga: Manga;
    episodesIndex: number;
    isExtra: boolean;
    page?: number | null;
  }) {
    super(props);

    this.state = {
      show: false,
      episodesUrls: {},
      menu: false,
      pageOffset: false,
      index: null,
      page: null,
    };
  }

  async componentDidMount() {
    // register for update events
    window.FUM.register(() => {
      this.forceUpdate(() => {
        // restore the previous page
        if (this.state.index && this.state.page && this.viewPoint)
          this.updateViewPort();
        this.scrollToPage(this.state.index!, this.state.page!);
      });
    });

    // show loader
    pushLoader();
    // get the urls
    await this.loadMore(undefined, true);
    // pop the loader
    window.stack.pop();

    // scroll to the target page if requested
    setTimeout(async () => {
      this.viewPoint?.camera.updateTopLeft(0, 0, 1);

      if (this.props.page) {
        const index = this.props.episodesIndex;
        const page = this.props.page;

        // check if the page is already loaded
        var element: HTMLElement | null;
        do {
          element = document.getElementById(`${index}_${page}`);
          // sleep for 50 ms
          await new Promise((resolve) => setTimeout(resolve, 50));
        } while (!element);

        this.scrollToPage(index, page);
      }
    }, 50);

    // fix the zoom factor
    let confirmCounter = 0;
    const confirmation = setInterval(() => {
      if (confirmCounter === 4) {
        clearInterval(confirmation);
        this.ready = true;
      }

      if (this.viewPoint?.zoomFactor !== 1)
        this.viewPoint?.camera.updateTopLeft(0, 0, 1);

      confirmCounter++;
    }, 250);
  }

  async loadMore(next: boolean = true, force: boolean = false) {
    // check if half of the images are loaded
    if (!this.ready && !force) return;

    // get next or previous episode
    var index =
      this.props.episodesIndex +
      (next ? -1 : 1) * Object.keys(this.state.episodesUrls).length;

    // check if out of range
    if (index < 0) return window.stack.push(<Warning noNextOne />);

    if (
      index >=
      (this.props.isExtra
        ? this.props.manga.episodes.extra
        : this.props.manga.episodes.serial
      ).length
    )
      return window.stack.push(<Warning noNextOne={false} />);

    // get the urls
    var urls = await this.props.manga.get(index, this.props.isExtra);
    this.setState(
      (prevState) => ({
        episodesUrls: {
          ...prevState.episodesUrls,
          [index]: urls,
        },
        show: true,
      }),
      () => setTimeout(() => this.tryRestoreViewPort(), 250)
    );
  }

  close() {
    this.setState({ show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
  }

  updateState(element: HTMLElement) {
    // get the data from the element
    const index = element.getAttribute("data-index");
    const page = element.getAttribute("data-page");

    if (
      index !== null &&
      page !== null &&
      (Number(index) !== this.state.index || Number(page) !== this.state.page)
    ) {
      this.setState({ index: Number(index), page: Number(page) + 1 }, () =>
        this.props.manga.save(
          (this.props.isExtra
            ? this.props.manga.episodes.extra
            : this.props.manga.episodes.serial)[this.state.index!],
          this.state.page!,
          this.props.isExtra
        )
      );
    }
  }

  componentWillUnmount() {
    // clear the timeout when unmount
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }
  }

  updateViewPort() {
    if (this.viewPoint && this.containerRef) {
      // set the bounds
      this.viewPoint.setBounds({
        x: [0, window.innerWidth],
        y: [-10, this.containerRef.clientHeight],
        zoom: [1, 3],
      });

      this.tryRestoreViewPort();
    }
  }

  tryRestoreViewPort() {
    // restore the previous position
    if (this.prevHeight)
      // DK why setTimeout solves this problem
      setTimeout(() =>
        this.viewPoint!.camera.updateTopLeft(
          this.viewPoint!.left,
          this.containerRef!.clientHeight - this.prevHeight!
        )
      );
  }

  toggleOffset() {
    // update the viewport
    this.prevHeight = null;
    this.setState({ pageOffset: !this.state.pageOffset }, () =>
      this.updateViewPort()
    );
  }

  scrollToPage(index: number, page: number) {
    const element = document.getElementById(`${index}_${page}`);

    // check if the element exists
    if (element) {
      // sync the state first
      this.setState({ index: index, page: page });

      this.viewPoint?.camera.centerFitElementIntoView(
        element,
        { additionalBounds: { zoom: [1, 1] } },
        { durationMilliseconds: 250 }
      );
    }
  }

  render(): ReactNode {
    const isVertical = window.innerWidth < window.innerHeight;
    const isOnePage: boolean =
      window.BMA.settingsState.displayMode === DisplayMode.OnePage ||
      (window.BMA.settingsState.displayMode === DisplayMode.Auto && isVertical);

    return (
      <div className="readWrapper">
        <Menu
          show={this.state.menu && this.state.show}
          close={this.close.bind(this)}
          page={this.state.page}
          showOffset={!isOnePage}
          toggleOffset={this.toggleOffset.bind(this)}
          pageOffset={this.state.pageOffset}
          scrollToPage={(page: number) =>
            this.scrollToPage(this.state.index!, page)
          }
          maxPage={
            this.state.index !== null
              ? this.state.episodesUrls[this.state.index].length
              : null
          }
          title={
            this.state.index !== null
              ? (this.props.isExtra
                  ? this.props.manga.episodes.extra
                  : this.props.manga.episodes.serial)[this.state.index]
              : null
          }
        />
        <CSSTransition
          in={this.state.show}
          classNames="read"
          timeout={this.timeout}
          unmountOnExit
          mountOnEnter
        >
          <div
            className="read"
            ref={(ref) => (this.readRef = ref)}
            onTouchStart={(event) => {
              const startX = event.changedTouches[0].pageX;
              // check if swipe from edge
              if (startX < 20) {
                this.startX = true;
              }
            }}
            onTouchMove={(event) => {
              // follow the touches
              if (this.startX && this.readRef) {
                this.readRef.style.transform = `translateX(${event.changedTouches[0].pageX}px)`;
              }
            }}
            onTouchEnd={(event) => {
              if (this.startX) {
                this.startX = false;
                const shouldClose = event.changedTouches[0].pageX > 150;

                // check if swiped 150 px
                if (shouldClose) {
                  this.close();
                }

                // reset the transform
                // DK why setTimeout is fixing the problem again
                setTimeout(() => {
                  this.readRef?.removeAttribute("style");

                  // add transition if no need to close
                  if (!shouldClose && this.readRef) {
                    this.readRef.style.transition = "transform 500ms";
                    setTimeout(
                      () => this.readRef?.removeAttribute("style"),
                      500
                    );
                  }
                });
              }
            }}
          >
            <Space
              pollForElementResizing
              treatTwoFingerTrackPadGesturesLikeTouch
              onCreate={(viewPort) => {
                // store the viewport
                this.viewPoint = viewPort;
              }}
              onUpdated={async () => {
                // check if bottom is reached
                if (
                  !this.loading &&
                  this.viewPoint!.top + this.viewPoint!.height ===
                    this.containerRef?.clientHeight
                ) {
                  this.loading = true;
                  // reset the previous height
                  this.prevHeight = null;

                  await this.loadMore();

                  // prevent too many requests
                  setTimeout(() => (this.loading = false), 1000);
                }

                // check if top is reached
                if (this.viewPoint!.top < 0) {
                  // prevent over scroll position with cooldown delay
                  if (!this.inCooldown) {
                    this.inCooldown = true;

                    setTimeout(() => {
                      this.viewPoint!.camera.updateTopLeft(
                        this.viewPoint!.left!,
                        0
                      );

                      this.inCooldown = false;
                    }, 250);
                  }

                  if (!this.loading) {
                    this.loading = true;
                    // cache the previous height
                    this.prevHeight = this.containerRef?.clientHeight ?? null;

                    await this.loadMore(false);

                    // prevent too many requests
                    setTimeout(() => (this.loading = false), 1000);
                  }
                }
              }}
            >
              <Pressable
                onTap={() => {
                  // reset the timeout
                  if (this.timeoutId !== null) {
                    clearTimeout(this.timeoutId);
                  }

                  // update counter
                  this.counter++;

                  // set timeout
                  this.timeoutId = setTimeout(async () => {
                    // check whether single click or double click
                    if (this.counter === 1) {
                      this.setState({ menu: !this.state.menu });
                    } else if (this.counter === 2) {
                      // zoom in or reset zoom factor
                      if (this.viewPoint) {
                        this.viewPoint.camera.moveBy(
                          0,
                          0,
                          this.viewPoint.zoomFactor === 3 ? -Infinity : 1,
                          undefined,
                          undefined,
                          { durationMilliseconds: 250 }
                        );
                      }
                    }

                    this.counter = 0;
                  }, 200);
                }}
              >
                <div
                  className="readContainer"
                  ref={(ref) => (this.containerRef = ref)}
                >
                  {Object.keys(this.state.episodesUrls)
                    .reverse()
                    .map((index: any) => (
                      <Fragment key={`${index}`}>
                        {this.state.episodesUrls[index].map((url, page) => (
                          <Fragment key={`${index}_${page}`}>
                            {!isOnePage &&
                              page === 0 &&
                              this.state.pageOffset && (
                                <div className="spacer" />
                              )}
                            <div
                              style={{
                                width:
                                  isOnePage ||
                                  this.wideImage.includes(`${index}_${page}`)
                                    ? "100%"
                                    : "50%",
                              }}
                              onMouseEnter={(event) =>
                                this.updateState(event.target as HTMLElement)
                              }
                              onTouchStart={(event) =>
                                this.updateState(event.target as HTMLElement)
                              }
                              id={`${index}_${page}`}
                              data-page={page}
                              data-index={index}
                            >
                              <img
                                src={url}
                                alt=""
                                onLoad={(event) => {
                                  // check if the image is horizontal
                                  const element =
                                    event.target as HTMLImageElement;
                                  if (
                                    element.naturalWidth >=
                                    element.naturalHeight
                                  ) {
                                    this.wideImage.push(`${index}_${page}`);
                                    this.forceUpdate(() =>
                                      this.updateViewPort()
                                    );
                                  }

                                  // update the bound
                                  this.updateViewPort();
                                }}
                              />
                            </div>
                          </Fragment>
                        ))}
                        {!isOnePage &&
                          (this.state.episodesUrls[index].length +
                            (this.state.pageOffset ? 1 : 0)) %
                            2 && <div className="spacer" />}
                      </Fragment>
                    ))}
                </div>
              </Pressable>
            </Space>
          </div>
        </CSSTransition>
      </div>
    );
  }
}

export default Read;
