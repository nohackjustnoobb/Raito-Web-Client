import "./read.scss";

import { Component, Fragment, ReactNode } from "react";

import { CSSTransition } from "react-transition-group";

import LazyImage from "../../components/lazyImage/lazyImage";
import {
  listenToEvents,
  RaitoEvents,
  RaitoSubscription,
} from "../../models/events";
import { Chapter, Manga } from "../../models/manga";
import { DisplayMode } from "../../models/settingsState";
import Menu from "./menu";
import Warning from "./warning";

enum ShouldLoad {
  next,
  previous,
  none,
}

interface Props {
  manga: Manga;
  chapterId: string;
  page?: number | null;
}

interface State {
  show: boolean;
  menu: boolean;
  page: number | null;
  id: string | null;
  pageOffset: boolean;
  scale: number;
  chaptersUrls: { [id: string]: Array<string> };
}

class Read extends Component<Props, State> {
  state: State = {
    show: false,
    chaptersUrls: {},
    menu: false,
    pageOffset: false,
    id: null,
    page: null,
    scale: 1,
  };

  // timeout of the transition
  timeout: number = 500;
  // cache for previous height
  prevHeight: number | null = null;
  // cache for previous scrollTop
  prevTop: number | null = null;
  // store image that is wider
  wideImage: Array<string> = [];
  // timer for updating the status
  statusUpdater: NodeJS.Timeout | null = null;
  // reference for read
  readRef: HTMLElement | null = null;
  // state for cool down
  lastLoad: number | null = null;
  // timeout for preventing too frequently loading
  timeoutId: NodeJS.Timeout | null = null;
  // check if transform should enabled
  isTouchOnEdge: boolean = false;
  // if the page is hidden
  isHidden: boolean = false;
  // if over scrolling the page
  isOverScrolling: boolean = false;
  // if the chapter is extra
  isExtra: boolean | null = null;
  // the initial chapter index
  initIndex: number | null = null;
  // cache for index and page
  indexPageCache: Array<[id: string, page: number]> = [];
  // mouse events data
  mouseDownStartPosition: { x: number; y: number } | null = null;
  mouseDownStartTime: number | null = null;
  mouseUpShouldLoad: ShouldLoad = ShouldLoad.none;
  doubleClickTimeoutId: NodeJS.Timeout | null = null;
  // used to update the menu only
  menuAction: ((page: number | null) => void) | null = null;
  raitoSubscription: RaitoSubscription | null = null;

  onVisibilityChange() {
    this.prevHeight = null;
    this.prevTop = null;

    if (document.visibilityState !== "visible") this.isHidden = true;
    else setTimeout(() => (this.isHidden = false), 500);
  }

  onTouchMove(event: TouchEvent) {
    if (this.isTouchOnEdge) event.preventDefault();
  }

  async componentDidMount() {
    // register for update events
    this.raitoSubscription = listenToEvents([RaitoEvents.screenChanged], () => {
      if (this.isHidden) return;

      // cache the page and index before updating
      if (this.indexPageCache.length) {
        const [id, page] = this.indexPageCache[0];
        this.forceUpdate(() => {
          // restore it
          if (page !== null && id !== null) this.scrollToPage(id, page);
        });
      }
    });

    // reset the prevHeight when the page hide or show
    document.addEventListener(
      "visibilitychange",
      this.onVisibilityChange.bind(this)
    );

    window.addEventListener("touchmove", this.onTouchMove.bind(this), {
      passive: false,
    });

    // show loader
    window.showLoader();
    // get the urls
    await this.loadMore(true, false);
    // pop the loader
    window.hideLoader();

    // update the status every 50 ms
    this.statusUpdater = setInterval(() => {
      const elements = document.elementsFromPoint(
        window.innerWidth / 2,
        window.innerHeight / 2
      );

      for (const element of elements) {
        if (element.className === "pageWrapper") {
          // get the data from the element
          const id = element.getAttribute("data-id");
          const rawPage = element.getAttribute("data-page");

          // check if null or changed
          if (id !== null && rawPage !== null) {
            const page = Number(rawPage);

            // cache the recent 10 index and page
            if (this.indexPageCache.length >= 10)
              this.indexPageCache.splice(0, 1);
            this.indexPageCache.push([id, page]);

            if (id !== this.state.id || page !== this.state.page) {
              this.setState({ id: id, page: page }, () =>
                // save it to history
                this.props.manga.save(
                  this.props.manga.getChapterById(id)!,
                  this.state.page!
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
        const chapterId = this.props.chapterId;
        const page = this.props.page;

        // check if the page is already loaded
        let loaded = true;
        do {
          loaded = true;
          for (let i = 0; i < page!; i++) {
            const element = document
              .getElementById(`${chapterId}_${i}`)
              ?.getElementsByTagName("img");
            if (
              !(
                element &&
                element.length &&
                (element[0] as HTMLImageElement).complete
              )
            )
              loaded = false;
          }

          // sleep for 50 ms
          await new Promise((resolve) => setTimeout(resolve, 50));
        } while (!loaded);

        this.scrollToPage(chapterId, page!);
      });
    }
  }

  componentWillUnmount() {
    if (this.statusUpdater) clearInterval(this.statusUpdater);

    if (this.raitoSubscription) this.raitoSubscription.unsubscribe();

    document.removeEventListener(
      "visibilitychange",
      this.onVisibilityChange.bind(this)
    );

    window.removeEventListener("touchmove", this.onTouchMove.bind(this));
  }

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    if (this.menuAction) this.menuAction(nextState.page);

    return nextState.page === this.state.page || nextState.id !== this.state.id;
  }

  async loadMore(next: boolean = true, setLastLoad: boolean = true) {
    if (this.lastLoad && Date.now() < this.lastLoad + 2500) return;
    this.lastLoad = Number.MAX_VALUE;

    // reset previous height data
    this.prevHeight = null;
    this.prevTop = null;

    if (this.isExtra === null) {
      this.isExtra =
        this.props.manga.chapters.extra.findIndex(
          (ch) => ch.id === this.props.chapterId
        ) !== -1;
    }

    if (this.initIndex === null) {
      this.initIndex = (
        this.isExtra
          ? this.props.manga.chapters.extra
          : this.props.manga.chapters.serial
      ).findIndex((ch) => ch.id === this.props.chapterId);

      if (this.initIndex === -1) window.stack.pop();
    }

    // get next or previous chapter
    const chapter: Chapter | undefined = (
      this.isExtra
        ? this.props.manga.chapters.extra
        : this.props.manga.chapters.serial
    )[
      this.initIndex +
        (next ? -1 : 1) * Object.keys(this.state.chaptersUrls).length
    ];

    var id: string | null = chapter?.id ?? null;

    // check if out of range
    if (!id) {
      this.lastLoad = setLastLoad ? Date.now() : null;
      return window.stack.push(<Warning noNextOne={next} />);
    }

    // get the urls
    var urls = await this.props.manga.getChapter(id);
    this.setState(
      (prevState) => ({
        chaptersUrls: {
          ...prevState.chaptersUrls,
          [id!]: urls,
        },
        show: true,
      }),
      () => {
        this.lastLoad = setLastLoad ? Date.now() : null;

        // load next chapter if less there page
        if (
          urls.length <= 3 &&
          Object.keys(this.state.chaptersUrls).length === 1
        ) {
          this.lastLoad = null;
          this.loadMore();
        }
      }
    );

    // cache previous height
    if (this.readRef) {
      // reset the height and scrollTop
      this.prevHeight = null;
      this.prevTop = null;

      if (next) this.prevTop = this.readRef.scrollTop;
      else this.prevHeight = this.readRef.scrollHeight;
    }
  }

  toggleOffset() {
    // update the viewport
    this.prevHeight = null;
    this.prevTop = null;

    if (this.indexPageCache.length) {
      const [id, page] = this.indexPageCache[0];
      this.setState({ pageOffset: !this.state.pageOffset }, () => {
        if (page !== null && id !== null) this.scrollToPage(id, page);
      });
    }
  }

  scrollToPage(id: string, page: number) {
    const element = document.getElementById(`${id}_${page}`);

    if (element) {
      element.scrollIntoView({
        behavior: "instant" as ScrollBehavior,
        block: "center",
        inline: "center",
      });
    }
  }

  close() {
    this.setState({ show: false });
    setTimeout(() => window.stack.pop(), this.timeout);
  }

  shouldLoadMore(event?: React.WheelEvent<HTMLDivElement>) {
    if (this.isOverScrolling) {
      this.restorePosition();

      if (this.readRef && this.readRef.scrollTop >= 0)
        this.isOverScrolling = false;
    }

    if (!this.timeoutId && this.readRef) {
      this.timeoutId = setTimeout(async () => {
        // check if bottom reached
        if (
          Math.round(this.readRef!.scrollTop + this.readRef!.offsetHeight) >=
          this.readRef!.scrollHeight
        )
          await this.loadMore();

        // check if top is reached
        if (
          this.readRef &&
          window.raito.settingsState.overscrollToLoadPreviousChapters &&
          !this.isOverScrolling &&
          (this.readRef.scrollTop < 0 ||
            (event && this.readRef.scrollTop === 0 && event.deltaY < 0))
        ) {
          await this.loadMore(false);

          if (this.readRef.scrollTop < 0) this.isOverScrolling = true;
        }

        this.timeoutId = null;
      }, 250);
    }
  }

  restorePosition() {
    if (this.readRef) {
      if (this.prevHeight)
        this.readRef.scrollTop = this.readRef.scrollHeight - this.prevHeight;
      if (this.prevTop && this.readRef.scrollTop > this.prevTop)
        this.readRef.scrollTop = this.prevTop;
    }
  }

  zoomTo(scale: number, offset?: { x: number; y: number }) {
    if (!window.raito.settingsState.experimentalUseZoomablePlugin) return;

    // limit the scale
    if (scale > 2) scale = 2;
    if (scale < 1) scale = 1;

    const originalScale = this.state.scale;
    const changedScale = scale / originalScale;
    if (changedScale === 1) return;

    // save the position
    var top: number, left: number;
    if (this.readRef) {
      top = this.readRef.scrollTop;
      left = this.readRef.scrollLeft;
    }

    // set default offset
    if (!offset) {
      offset = this.readRef
        ? {
            x: this.readRef.clientWidth / 2,
            y: this.readRef.clientHeight / 2,
          }
        : { x: 0, y: 0 };
    }

    this.setState({ scale: scale }, () => {
      if (this.readRef) {
        var newLeft = (offset!.x + left) * changedScale - offset!.x;

        // FIXME bugged
        if (newLeft < 0) newLeft = 0;
        const maxLeft = this.readRef.scrollWidth - this.readRef.clientWidth;
        if (newLeft > maxLeft) newLeft = maxLeft;

        this.readRef.scrollTop = (offset!.y + top) * changedScale - offset!.y;
        this.readRef.scrollLeft = newLeft;
      }
    });
  }

  mouseUpAction() {
    // check if it is click only
    if (
      this.mouseDownStartTime &&
      this.mouseDownStartTime! + 100 > Date.now()
    ) {
      if (this.doubleClickTimeoutId) {
        clearTimeout(this.doubleClickTimeoutId);
        this.doubleClickTimeoutId = null;
      }

      this.doubleClickTimeoutId = setTimeout(
        () => this.setState({ menu: !this.state.menu }),
        window.raito.settingsState.experimentalUseZoomablePlugin ? 250 : 0
      );
    }

    if (this.mouseUpShouldLoad !== ShouldLoad.none) {
      this.loadMore(this.mouseUpShouldLoad === ShouldLoad.next);
    }

    // reset state
    this.mouseDownStartTime = null;
    this.mouseDownStartPosition = null;
    this.mouseUpShouldLoad = ShouldLoad.none;
  }

  subscribe(action: (page: number | null) => void) {
    if (!this.menuAction) this.menuAction = action;
  }

  render(): ReactNode {
    const isVertical = window.innerWidth < window.innerHeight;
    const isOnePage: boolean =
      window.raito.settingsState.displayMode === DisplayMode.OnePage ||
      (window.raito.settingsState.displayMode === DisplayMode.Auto &&
        isVertical);

    const sortedChaptersId = Object.keys(this.state.chaptersUrls);
    const chaptersOrder = (
      this.isExtra
        ? this.props.manga.chapters.extra
        : this.props.manga.chapters.serial
    ).map((v) => v.id);
    sortedChaptersId.sort(
      (a, b) => chaptersOrder.indexOf(b) - chaptersOrder.indexOf(a)
    );

    return (
      <div className="readWrapper">
        <Menu
          subscribe={this.subscribe.bind(this)}
          show={this.state.menu && this.state.show}
          close={this.close.bind(this)}
          zoomIn={() => this.zoomTo(this.state.scale + 0.5)}
          zoomOut={() => this.zoomTo(this.state.scale - 0.5)}
          zoom={window.raito.settingsState.experimentalUseZoomablePlugin}
          scale={this.state.scale}
          showOffset={!isOnePage}
          toggleOffset={this.toggleOffset.bind(this)}
          pageOffset={this.state.pageOffset}
          scrollToPage={(page: number) =>
            this.scrollToPage(this.state.id!, page)
          }
          maxPage={
            this.state.id !== null
              ? this.state.chaptersUrls[this.state.id].length
              : null
          }
          title={
            this.state.id !== null
              ? this.props.manga.getChapterById(this.state.id)!.title
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
            ref={(ref) => (this.readRef = ref)}
            className={
              window.raito.settingsState.snapToPage ? "read snapToPage" : "read"
            }
            onDoubleClick={(event) => {
              if (this.doubleClickTimeoutId) {
                clearTimeout(this.doubleClickTimeoutId);
                this.doubleClickTimeoutId = null;
              }

              if (this.state.scale >= 2) {
                this.zoomTo(1);
              } else {
                this.zoomTo(this.state.scale + 0.5, {
                  x: event.clientX,
                  y: event.clientY,
                });
              }
            }}
            onMouseDown={(event) => {
              if (this.readRef) {
                this.mouseDownStartPosition = {
                  x: event.clientX + this.readRef.scrollLeft,
                  y: event.clientY + this.readRef.scrollTop,
                };
                this.mouseDownStartTime = Date.now();
              }
            }}
            onMouseMove={(event) => {
              if (this.mouseDownStartPosition && this.readRef) {
                const newTop = this.mouseDownStartPosition.y - event.clientY;

                this.readRef.scrollLeft =
                  this.mouseDownStartPosition.x - event.clientX;
                this.readRef.scrollTop = newTop;

                // check whether it should load more
                const maxTop =
                  this.readRef.scrollHeight - this.readRef.clientHeight;
                if (maxTop < newTop) {
                  this.mouseUpShouldLoad = ShouldLoad.next;
                }
                if (newTop < 0) {
                  this.mouseUpShouldLoad = ShouldLoad.previous;
                }
              }
            }}
            onMouseUp={() => this.mouseUpAction()}
            onMouseLeave={() => this.mouseUpAction()}
            onScroll={() => this.shouldLoadMore()}
            onWheel={(event) => this.shouldLoadMore(event)}
            onTouchStart={(event) => {
              const startX = event.changedTouches[0].pageX;
              // check if swipe from edge
              if (startX < 20) {
                this.isTouchOnEdge = true;
              }
            }}
            onTouchMove={(event) => {
              // follow the touches
              if (this.isTouchOnEdge && this.readRef) {
                this.readRef.style.transform = `translateX(${event.changedTouches[0].pageX}px)`;
              }
            }}
            onTouchEnd={(event) => {
              if (this.isTouchOnEdge && this.readRef) {
                this.isTouchOnEdge = false;
                const shouldClose = event.changedTouches[0].pageX > 100;

                // check if swiped 150 px
                if (shouldClose) this.close();

                // reset the transform
                // DK why setTimeout is fixing the problem again
                setTimeout(() => {
                  this.readRef!.removeAttribute("style");

                  // add transition if no need to close
                  if (!shouldClose) {
                    this.readRef!.style.transition = "transform 500ms";
                    setTimeout(
                      () => this.readRef!.removeAttribute("style"),
                      500
                    );
                  }
                });
              }
            }}
          >
            <div
              className="readContent"
              style={{ width: `${this.state.scale * 100}%` }}
            >
              {sortedChaptersId.map((chapterId: any) => (
                <div className="chapters" key={chapterId}>
                  {this.state.chaptersUrls[chapterId]?.map((url, page) => {
                    const id = `${chapterId}_${page}`;

                    return (
                      <Fragment key={id}>
                        {page === 0 && this.state.pageOffset && !isOnePage && (
                          <div className="spacer" />
                        )}
                        <div
                          id={id}
                          data-page={page}
                          data-id={chapterId}
                          className="pageWrapper"
                          style={{
                            width:
                              this.wideImage.includes(id) || isOnePage
                                ? "100%"
                                : "50%",
                          }}
                        >
                          <LazyImage
                            src={url}
                            onLoad={(event) => {
                              // check if the image is horizontal
                              const element = event.target as HTMLImageElement;
                              const shouldRestore =
                                this.prevHeight || (this.prevTop && page < 2);

                              if (
                                element.naturalWidth >= element.naturalHeight
                              ) {
                                this.wideImage.push(id);
                                this.forceUpdate(() => {
                                  if (shouldRestore) this.restorePosition();
                                });
                              } else if (shouldRestore) {
                                this.restorePosition();
                              }
                            }}
                            lazy={false}
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

export default Read;
