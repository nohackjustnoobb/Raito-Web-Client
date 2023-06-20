import { Component, Fragment, ReactNode } from "react";
import { CSSTransition } from "react-transition-group";

import { Manga } from "../../classes/manga";
import Warning from "./warning";
import { pushLoader } from "../../utils/utils";
import { DisplayMode } from "../../classes/settingsState";

import "./read_stable.scss";
import Menu from "./menu";

class ReadStable extends Component<
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
  // cache for previous height
  prevHeight: number | null = null;
  // store image that is wider
  wideImage: Array<string> = [];
  // timer for updating the status
  statusUpdater: NodeJS.Timeout | null = null;
  // reference for read
  readRef: HTMLElement | null = null;
  // state for cooldown
  lastLoad: number | null = null;
  // timeout for preventing too frequently loading
  timeoutId: NodeJS.Timeout | null = null;
  // check if transform should enabled
  startX: boolean = false;

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
      // cache the page and index before updating
      const page = this.state.page;
      const index = this.state.index;
      this.forceUpdate(() => {
        // restore it
        if (page && index) this.scrollToPage(index, page, false);
      });
    });

    // show loader
    pushLoader();
    // get the urls
    await this.loadMore(true, false);
    // pop the loader
    window.stack.pop();

    // update the status every 1 second
    this.statusUpdater = setInterval(() => {
      const elements = document.elementsFromPoint(
        window.innerWidth / 2,
        window.innerHeight / 2
      );

      for (const element of elements) {
        if (element.className === "imgWrapper") {
          // get the data from the element
          const index = element.getAttribute("data-index");
          const page = element.getAttribute("data-page");

          // check if null or changed
          if (
            index !== null &&
            page !== null &&
            (Number(index) !== this.state.index ||
              Number(page) !== this.state.page)
          ) {
            this.setState(
              { index: Number(index), page: Number(page) + 1 },
              () =>
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

          break;
        }
      }
    }, 250);

    // scroll to the target page if requested
    if (this.props.page) {
      setTimeout(async () => {
        const index = this.props.episodesIndex;
        const page = this.props.page;

        // check if the page is already loaded
        var element: HTMLElement | null;
        do {
          element = document.getElementById(`${index}_${page}`);
          // sleep for 50 ms
          await new Promise((resolve) => setTimeout(resolve, 50));
        } while (
          !element ||
          !(element.children[0] as HTMLImageElement).complete
        );

        this.scrollToPage(index, page!, false);
      }, 50);
    }
  }

  componentWillUnmount() {
    if (this.statusUpdater) clearInterval(this.statusUpdater);
  }

  async loadMore(next: boolean = true, setLastLoad: boolean = true) {
    if (this.lastLoad && Date.now() < this.lastLoad + 5000) return;
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
      this.prevHeight = this.readRef.scrollHeight;
    }
  }

  toggleOffset() {
    // update the viewport
    this.prevHeight = null;
    this.setState({ pageOffset: !this.state.pageOffset });
  }

  scrollToPage(index: number, page: number, smooth: boolean = true) {
    const element = document.getElementById(`${index}_${page}`);

    if (element) {
      element.scrollIntoView({
        behavior: (smooth ? "smooth" : "instant") as ScrollBehavior,
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
    if (!this.timeoutId) {
      this.timeoutId = setTimeout(async () => {
        // check if bottom reached
        if (
          this.readRef &&
          (this.readRef.scrollTop + this.readRef.offsetHeight >
            this.readRef.scrollHeight ||
            (event &&
              this.readRef.scrollTop + this.readRef.offsetHeight ===
                this.readRef.scrollHeight &&
              event.deltaY > 0))
        ) {
          await this.loadMore();
        }

        // check if top is reached
        if (
          this.readRef &&
          (this.readRef.scrollTop < 0 ||
            (event && this.readRef.scrollTop === 0 && event.deltaY < 0))
        ) {
          await this.loadMore(false);
        }

        this.timeoutId = null;
      }, 250);
    }
  }

  restorePosition() {
    if (this.prevHeight && this.readRef) {
      this.readRef.scrollTop = this.readRef.scrollHeight - this.prevHeight;
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
            ref={(ref) => (this.readRef = ref)}
            className="read"
            onClick={() => this.setState({ menu: !this.state.menu })}
            onScroll={() => this.shouldLoadMore()}
            onWheel={(event) => this.shouldLoadMore(event)}
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

export default ReadStable;
