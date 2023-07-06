import { Component, Fragment, ReactNode } from "react";
import { CSSTransition } from "react-transition-group";
import BetterScroll from "better-scroll";

import "./read_experimental.scss";
import { Manga } from "../../classes/manga";
import Warning from "./warning";
import { pushLoader } from "../../utils/utils";
import { DisplayMode } from "../../classes/settingsState";
import Menu from "./menu";

class ReadExperimental extends Component<
  {
    manga: Manga;
    episodesIndex: number;
    isExtra: boolean;
    page?: number | null;
  },
  {
    show: boolean;
    episodesUrls: { [index: number]: Array<string> };
    menu: boolean;
    page: number | null;
    index: number | null;
    pageOffset: boolean;
  }
> {
  // timeout of the transition
  timeout: number = 500;
  // BetterScroll
  betterScroll: BetterScroll | null = null;
  // cache for previous height
  prevHeight: number | null = null;
  // reference for read
  readRef: HTMLElement | null = null;
  // state for cooldown
  lastLoad: number | null = null;
  // store image that is wider
  wideImage: Array<string> = [];
  // scale of the content
  scale: number = 1;
  // timeout for preventing tap to fire when double clicked
  timeoutId: NodeJS.Timeout | null = null;
  // timer for updating the status
  statusUpdater: NodeJS.Timeout | null = null;
  // if the page is hidden
  isHidden: boolean = false;
  // check if transform should enabled
  startX: boolean = false;
  // id of ForceUpdateManager
  FUMID: number | null = null;
  // cache for index and page
  indexPageCache: Array<[index: number, page: number]> = [];

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
    // init BetterScroll
    setTimeout(async () => {
      while (!this.readRef) {
        // sleep for 50 ms
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      this.betterScroll = new BetterScroll(this.readRef, {
        mouseWheel: {
          speed: 20,
          invert: false,
          easeTime: 300,
        },
        tap: "tap",
        dblclick: {
          delay: 300,
        },
        pullDownRefresh: window.BMA.settingsState
          .overscrollToLoadPreviousEpisodes
          ? {
              threshold: 50,
              stop: 0,
            }
          : undefined,
        pullUpLoad: {
          threshold: 50,
          stop: 0,
        },
        deceleration: 0.002,
        freeScroll: true,
        zoom: {
          start: 1,
          min: 1,
          max: 2,
        },
      });

      // sync the scale
      this.betterScroll.on(
        "zoomEnd",
        (event: { scale: number }) => (this.scale = event.scale)
      );

      this.betterScroll.on("pullingDown", async () => {
        await this.loadMore(false);
        this.betterScroll!.finishPullDown();
      });

      this.betterScroll.on("pullingUp", async () => {
        await this.loadMore();
        this.betterScroll!.finishPullUp();
      });

      // double click to zoom in and out
      this.readRef.addEventListener("dblclick", (event) => {
        setTimeout(() => {
          if (this.timeoutId) clearTimeout(this.timeoutId);
          this.timeoutId = null;

          this.betterScroll?.zoomTo(
            this.scale === 2 ? 1 : 2,
            -this.betterScroll.x + event.x,
            -this.betterScroll.y + event.y
          );
        });
      });

      // single click to toggle menu
      this.readRef.addEventListener("tap", (event) => {
        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(() => {
          this.setState({ menu: !this.state.menu });
        }, 300);
      });
    });

    // register for update events
    this.FUMID = window.FUM.register(() => {
      if (this.isHidden) return;

      // cache the page and index before updating
      const [index, page] = this.indexPageCache[0];
      this.forceUpdate(() => {
        // restore it
        if (page && index) this.scrollToPage(index, page);
      });
    }, true);

    // reset the prevHeight when the page hide or show
    document.addEventListener("visibilitychange", () => {
      this.prevHeight = null;

      if (document.visibilityState !== "visible") {
        this.isHidden = true;
      } else {
        setTimeout(() => (this.isHidden = false), 500);
      }
    });

    // show loader
    pushLoader();
    // get the urls
    await this.loadMore(true, false);
    // pop the loader
    window.stack.pop();

    // update the status every 250 ms
    this.statusUpdater = setInterval(() => {
      const elements = document.elementsFromPoint(
        window.innerWidth / 2,
        window.innerHeight / 2
      );

      for (const element of elements) {
        if (element.className === "imgWrapper") {
          // get the data from the element
          const rawIndex = element.getAttribute("data-index");
          const rawPage = element.getAttribute("data-page");

          // check if null or changed
          if (rawIndex !== null && rawPage !== null) {
            const index = Number(rawIndex);
            const page = Number(rawPage);

            // cache the recent 10 index and page
            if (this.indexPageCache.length >= 10)
              this.indexPageCache.splice(0, 1);
            this.indexPageCache.push([index, page]);

            if (index !== this.state.index || page !== this.state.page) {
              this.setState({ index: index, page: page }, () =>
                // save it to history
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

          break;
        }
      }
    }, 50);

    // scroll to the target page if requested
    if (this.props.page) {
      // use setTimeout to prevent it from blocking the code execution
      setTimeout(async () => {
        const index = this.props.episodesIndex;
        const page = this.props.page;

        // check if the page is already loaded
        let loaded = true;
        do {
          loaded = true;
          for (let i = 0; i < page!; i++) {
            const element = document.getElementById(`${index}_${i}`);
            if (!element || !(element.children[0] as HTMLImageElement).complete)
              loaded = false;
          }

          // sleep for 50 ms
          await new Promise((resolve) => setTimeout(resolve, 50));
        } while (!loaded);

        this.scrollToPage(index, page!);
      });
    }
  }

  async loadMore(next: boolean = true, setLastLoad: boolean = true) {
    if (this.lastLoad && Date.now() < this.lastLoad + 1000) return;
    if (setLastLoad) this.lastLoad = Date.now();

    // reset previous height data
    this.prevHeight = null;

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
    this.setState((prevState) => ({
      episodesUrls: {
        ...prevState.episodesUrls,
        [index]: urls,
      },
      show: true,
    }));

    // cache previous height
    if (!next && this.readRef) {
      this.prevHeight = this.readRef.children[0].clientHeight;
    }
  }

  componentWillUnmount() {
    if (this.statusUpdater) clearInterval(this.statusUpdater);
    if (this.FUMID) window.FUM.unregister(this.FUMID);
  }

  componentDidUpdate() {
    // update the BetterScroll state
    this.betterScroll?.refresh();
  }

  scrollToPage(index: number, page: number) {
    const element = document.getElementById(`${index}_${page}`);

    if (element) this.betterScroll?.scrollToElement(element, 0, 0, 0);
  }

  toggleOffset() {
    // update the viewport
    this.prevHeight = null;
    this.setState({ pageOffset: !this.state.pageOffset });
  }

  close() {
    this.setState({ show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
  }

  restorePosition() {
    this.betterScroll?.refresh();
    if (this.prevHeight && this.readRef) {
      this.betterScroll?.scrollTo(
        this.betterScroll.x,
        -(this.readRef.children[0].clientHeight - this.prevHeight),
        0
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
          page={this.state.page !== null ? this.state.page + 1 : null}
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
                this.betterScroll?.disable();
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
                this.betterScroll?.enable();
                const shouldClose = event.changedTouches[0].pageX > 100;

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
            <div className="readContent">
              {Object.keys(this.state.episodesUrls)
                .reverse()
                .map((episodesIndex: any) => (
                  <div className="episodes" key={episodesIndex}>
                    {this.state.episodesUrls[episodesIndex].map((url, page) => {
                      const id = `${episodesIndex}_${page}`;

                      return (
                        <Fragment key={id}>
                          {page === 0 &&
                            this.state.pageOffset &&
                            !isOnePage && <div className="spacer" />}
                          <div
                            id={id}
                            data-page={page}
                            data-index={episodesIndex}
                            className="imgWrapper"
                            style={{
                              width:
                                this.wideImage.includes(id) || isOnePage
                                  ? "100%"
                                  : "50%",
                            }}
                          >
                            <img
                              src={url}
                              alt=""
                              onLoad={(event) => {
                                // check if the image is horizontal
                                const element =
                                  event.target as HTMLImageElement;
                                if (
                                  element.naturalWidth >= element.naturalHeight
                                ) {
                                  this.wideImage.push(id);
                                  this.forceUpdate(() =>
                                    this.restorePosition()
                                  );
                                }

                                this.restorePosition();
                              }}
                            />
                          </div>
                        </Fragment>
                      );
                    })}
                  </div>
                ))}
            </div>
          </div>
        </CSSTransition>
      </div>
    );
  }
}

export default ReadExperimental;
