import "./read.scss";

import { Component, SyntheticEvent } from "react";

import LazyImage from "../../components/lazyImage/lazyImage";
import settingsManager, { DisplayMode } from "../../managers/settingsManager";
import {
  listenToEvents,
  RaitoEvents,
  RaitoSubscription,
} from "../../models/events";
import { Chapter, DetailsManga } from "../../models/manga";
import { mode } from "../../utils/utils";
import makeSwipeable, {
  InjectedSwipeableProps,
} from "../swipeableScreen/swipeableScreen";
import Menu from "./menu";
import Warning, { WarningType } from "./warning";

const TIMEOUT = 2500;

interface Props extends InjectedSwipeableProps {
  manga: DetailsManga;
  chapterId: string;
  page?: number;
}

enum LoadTypes {
  Initial,
  Previous,
  Next,
}

interface Urls {
  chapter: Chapter;
  index: number;
  urls: Array<string>;
}

interface Page {
  index: number;
  title: string;
  page: number;
  total: number;
}

interface State {
  urls: Array<Urls>;
  imagesMeta: { [key: string]: number };
  isPageOffset: boolean;
  showMenu: boolean;
  isVertical: boolean;
  currentPage: Page | null;
}

class Read extends Component<Props, State> {
  // the array of chapter that is currently being read
  chapters!: Array<Chapter>;
  // the initial chapter index
  initIndex!: number;
  // the number of chapter that is before the initial chapter have been loaded plus 1
  previousLoaded: number = 1;
  // the number of chapter that is after the initial chapter have been loaded plus 1
  nextLoaded: number = 1;
  // state for cool down
  lastLoad: number = Number.MIN_VALUE;
  // subscriptions for raito events
  raitoSubscription!: RaitoSubscription;
  // timeout to prevent too many events
  onScrollTimeout: NodeJS.Timeout | null = null;
  // ref to the scrollable element
  scrollableRef: HTMLDivElement | null = null;
  // determines whether if it is overscrolling
  isOverScrolling: boolean = false;
  // determines the page before loading the new chapter
  previousPage: Page | null = null;
  // prediction for the image ratio
  predictedRatio?: number;

  state: State = {
    // a array of the images with its metadata
    urls: [],
    imagesMeta: {},
    isPageOffset: false,
    showMenu: false,
    currentPage: null,
    isVertical: window.innerHeight > window.innerWidth,
  };

  componentDidMount() {
    this.raitoSubscription = listenToEvents([RaitoEvents.screenChanged], () => {
      const isVertical = window.innerHeight > window.innerWidth;
      if (this.state.isVertical !== isVertical)
        this.setState({ isVertical: isVertical }, () => this.restorePage());
      else this.restorePage();
    });

    const isExtra =
      this.props.manga.chapters.extra.findIndex(
        (ch) => ch.id === this.props.chapterId
      ) !== -1;

    this.chapters = isExtra
      ? this.props.manga.chapters.extra
      : this.props.manga.chapters.serial;

    this.initIndex = this.chapters.findIndex(
      (ch) => ch.id === this.props.chapterId
    );

    this.load(LoadTypes.Initial);
  }

  componentWillUnmount() {
    if (this.raitoSubscription) this.raitoSubscription.unsubscribe();
  }

  async load(type: LoadTypes = LoadTypes.Next) {
    if (Date.now() < this.lastLoad + TIMEOUT) return;
    this.lastLoad = Number.MAX_VALUE;

    // get the id of the chapter to load
    const index =
      this.initIndex +
      (type &&
        (type === LoadTypes.Previous ? this.previousLoaded : -this.nextLoaded));

    if (index < 0) {
      this.lastLoad = Date.now();
      window.stack.push(<Warning type={WarningType.NoNextOne} />);
      return;
    } else if (index >= this.chapters.length) {
      this.lastLoad = Date.now();
      window.stack.push(<Warning type={WarningType.NoPreviousOne} />);

      return;
    }

    const chapter = this.chapters[index];

    const result = {
      chapter: chapter,
      index: index,
      urls: await this.props.manga.getChapterUrls(chapter.id),
    };

    let newUrls: Array<Urls> = [result];
    if (type)
      type === LoadTypes.Previous
        ? newUrls.push(...this.state.urls)
        : newUrls.unshift(...this.state.urls);

    this.previousPage = this.state.currentPage;
    this.setState({ urls: newUrls }, () => (this.lastLoad = Date.now()));

    if (type)
      type === LoadTypes.Previous ? this.previousLoaded++ : this.nextLoaded++;
  }

  imageOnLoad(event: SyntheticEvent<HTMLImageElement, Event>, key: string) {
    // check if the image horizontal
    const element = event.target as HTMLImageElement;

    this.setState(
      (state) => ({
        imagesMeta: {
          ...state.imagesMeta,
          [key]: element.naturalWidth / element.naturalHeight,
        },
      }),
      () => {
        // jump to the requested page
        const page = this.props.page || 0;
        for (let i = 0; i <= page; i++) {
          if (!this.state.imagesMeta[`${this.initIndex}_${i}`]) break;

          if (i === page) this.scrollToPage(this.initIndex, i);
        }
      }
    );

    if (this.previousPage) this.restorePage(this.previousPage || undefined);
    else setTimeout(this.tryUpdatePage.bind(this), 100);
  }

  toggleMenu() {
    this.setState({ showMenu: !this.state.showMenu });
  }

  togglePageOffset() {
    this.setState({ isPageOffset: !this.state.isPageOffset }, () =>
      this.restorePage()
    );
  }

  close() {
    this.setState({ showMenu: false });
    this.props.close();
  }

  tryUpdatePage() {
    const elems = document.elementsFromPoint(
      window.innerWidth / 2,
      window.innerHeight / 2
    );

    for (const elem of elems) {
      if (elem.className === "pageWrapper") {
        // get the data from the element
        const rawIndex = elem.getAttribute("data-index");
        const rawPage = elem.getAttribute("data-page");

        // check if null
        // TODO check if the page is jumping too far
        if (rawIndex !== null && rawPage !== null) {
          const page = Number(rawPage);
          const index = Number(rawIndex);
          const chapter = this.chapters[index];

          // check if changed
          if (
            !this.state.currentPage ||
            this.state.currentPage.index !== index ||
            this.state.currentPage.page !== page
          ) {
            this.setState(
              {
                currentPage: {
                  title: chapter.title,
                  index: index,
                  page: page,
                  total: this.state.urls.find((v) => v.index === index)!.urls
                    .length,
                },
              },
              () =>
                // save it to history
                this.props.manga.save(chapter, page)
            );
          }
        }

        break;
      }
    }
  }

  scrollToPage(index: number, page: number) {
    const element = document.getElementById(`${index}_${page}`);

    if (element)
      element.scrollIntoView({
        behavior: "instant" as ScrollBehavior,
        block: "center",
        inline: "center",
      });
  }

  restorePage(page?: Page) {
    const target = page || this.state.currentPage;

    if (!target) return;

    this.scrollToPage(target.index, target.page);
  }

  onScroll(event?: React.WheelEvent<HTMLDivElement>) {
    this.tryUpdatePage();

    if (this.isOverScrolling) {
      if (this.scrollableRef && this.scrollableRef.scrollTop >= 0)
        this.isOverScrolling = false;
    }

    if (!this.onScrollTimeout && this.scrollableRef) {
      this.onScrollTimeout = setTimeout(() => {
        if (
          Math.round(
            this.scrollableRef!.scrollTop + this.scrollableRef!.offsetHeight
          ) >= this.scrollableRef!.scrollHeight
        ) {
          this.load(LoadTypes.Next);
        }

        if (
          settingsManager.overscrollToLoadPreviousChapters &&
          !this.isOverScrolling &&
          (this.scrollableRef!.scrollTop < 0 ||
            (event && this.scrollableRef!.scrollTop === 0 && event.deltaY < 0))
        ) {
          this.load(LoadTypes.Previous);

          if (this.scrollableRef!.scrollTop < 0) this.isOverScrolling = true;
        }

        this.onScrollTimeout = null;
      }, 250);
    }
  }

  render() {
    const isOnePaged: boolean =
      settingsManager.displayMode === DisplayMode.OnePage ||
      (settingsManager.displayMode === DisplayMode.Auto &&
        this.state.isVertical);
    this.predictedRatio = mode(Object.values(this.state.imagesMeta));

    return (
      <div
        className={
          "experimentalRead" + (settingsManager.snapToPage ? " snapToPage" : "")
        }
        onScroll={() => this.onScroll()}
        onWheel={this.onScroll.bind(this)}
        ref={(ref) => (this.scrollableRef = ref)}
      >
        <Menu
          show={this.state.showMenu}
          close={this.close.bind(this)}
          page={this.state.currentPage || undefined}
          showPageOffset={!this.state.isVertical}
          isPageOffset={this.state.isPageOffset}
          togglePageOffset={this.togglePageOffset.bind(this)}
          scrollToPage={this.scrollToPage.bind(this)}
        />
        <div className="images" onClick={this.toggleMenu.bind(this)}>
          {this.state.urls.map((meta) => (
            <ul key={meta.chapter.id}>
              {this.state.isPageOffset && !isOnePaged && (
                <li className="spacer" />
              )}
              {meta.urls.map((url, index) => {
                const key = `${meta.index}_${index}`;

                return (
                  <li
                    key={key}
                    id={key}
                    data-index={meta.index}
                    data-page={index}
                    className="pageWrapper"
                    style={{
                      width:
                        this.state.imagesMeta[key] >= 1 || isOnePaged
                          ? "100%"
                          : "50%",
                      aspectRatio: this.predictedRatio,
                    }}
                  >
                    <LazyImage
                      src={url}
                      lazy={false}
                      onLoad={(e) => this.imageOnLoad(e, key)}
                    />
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
      </div>
    );
  }
}

export default makeSwipeable(Read);
export type { Page };
