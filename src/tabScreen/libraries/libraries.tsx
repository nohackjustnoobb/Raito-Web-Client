import React from "react";
import Icon from "@mdi/react";
import { mdiChevronDown, mdiDatabase, mdiMagnify } from "@mdi/js";

import TabScreen from "../tabScreen";
import { InfinitySpin } from "react-loader-spinner";
import { convertRemToPixels, listenToEvents } from "../../utils/utils";
import { SimpleManga } from "../../models/manga";
import RaitoEvent from "../../models/event";
import LazyImage from "../../utils/lazyImage";
import "./libraries.scss";
import Driver from "../../models/driver";

const categories: { [category: string]: string } = {
  Passionate: "熱血",
  Love: "戀愛",
  Campus: "校園",
  Yuri: "百合",
  Otokonoko: "偽娘",
  BL: "甲甲",
  Adventure: "冒險",
  Harem: "后宮",
  SciFi: "科幻",
  War: "戰爭",
  Suspense: "懸疑",
  Speculation: "推理",
  Funny: "搞笑",
  Fantasy: "奇幻",
  Magic: "魔法",
  Horror: "恐怖",
  Ghosts: "神鬼",
  History: "歷史",
  FanFi: "同人",
  Sports: "運動",
  Hentai: "Hentai",
  Mecha: "機甲",
  Restricted: "R15",
};

class LibrariesTabState extends React.Component {
  componentDidMount() {
    // register for update events
    listenToEvents([RaitoEvent.driverChanged], this.forceUpdate.bind(this));
  }

  render(): React.ReactNode {
    return (
      <div id="drivers">
        <Icon
          path={mdiDatabase}
          size={0.75}
          style={{ transform: "translateX(2rem)" }}
        />
        <select
          value={window.raito.selectedDriver?.identifier}
          onChange={async (event) => {
            // change the selected driver
            await Driver.select(event.target.value);
          }}
        >
          {window.raito.availableDrivers?.map((v) => (
            <option key={v.identifier}>{v.identifier}</option>
          ))}
        </select>
        <Icon path={mdiChevronDown} size={0.75} />
      </div>
    );
  }
}

class SearchBar extends React.Component<
  { keyword: string | null },
  { keyword: string; suggestions: Array<string> | undefined; focus: boolean }
> {
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(props: { keyword: string | null }) {
    super(props);

    this.state = {
      keyword: "",
      suggestions: undefined,
      focus: false,
    };
    this.timeoutId = null;
  }

  componentWillUnmount() {
    // clear the timeout when unmount
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }
  }

  componentDidUpdate(prevProps: { keyword: string | null }) {
    if (this.props.keyword !== prevProps.keyword)
      this.setState({ keyword: this.props.keyword ?? "" });
  }

  render(): React.ReactNode {
    return (
      <div id="search">
        <div id="searchBar">
          <input
            enterKeyHint="search"
            value={this.state.keyword}
            onFocus={() => {
              this.setState({ focus: true });
              window.toggleTab(false);
            }}
            onBlur={() => {
              setTimeout(() => this.setState({ focus: false }), 250);
              window.toggleTab(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                const element = event.target as HTMLDivElement;

                // blur the input and search
                element.blur();
                window.search(this.state.keyword);
              }
            }}
            onChange={(event) => {
              // set the search text
              this.setState({ keyword: event.target.value });
              // reset the timeout
              if (this.timeoutId !== null) {
                clearTimeout(this.timeoutId);
              }

              // set timeout
              this.timeoutId = setTimeout(async () => {
                this.setState({
                  suggestions:
                    await window.raito.selectedDriver?.getSuggestions(
                      this.state.keyword
                    ),
                });
              }, 500);
            }}
          />
          <div
            className="icon"
            onClick={(event) => {
              const element = event.target as HTMLDivElement;

              // blur the input and search
              element.blur();
              window.search(this.state.keyword);
            }}
          >
            <Icon path={mdiMagnify} size={1} color={"#999999"} />
          </div>
        </div>
        {Boolean(this.state.suggestions?.length) && this.state.focus && (
          <ul id="suggestions">
            {this.state.suggestions!.map((suggestion) => (
              <li
                key={suggestion}
                onClick={() => {
                  this.setState({
                    keyword: window.raito.translate(suggestion),
                  });
                  window.search(window.raito.translate(suggestion));
                }}
              >
                <span>{window.raito.translate(suggestion)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
}

class LibrariesTab extends React.Component<
  {},
  { catergory: string; loading: boolean; keyword: string | null }
> {
  driver: string | undefined = undefined;
  content: HTMLDivElement | null = null;

  constructor(props: {}) {
    super(props);

    this.state = {
      catergory: "",
      loading: false,
      keyword: null,
    };
  }

  componentDidMount(): void {
    // register for update events
    listenToEvents(
      [
        RaitoEvent.driverChanged,
        RaitoEvent.tabChanged,
        RaitoEvent.settingsChanged,
        RaitoEvent.screenChanged,
      ],
      this.forceUpdate.bind(this)
    );

    // update the ui when the page hide or show
    document.addEventListener("visibilitychange", () =>
      setTimeout(() => this.forceUpdate(), 250)
    );

    // set global variable for searching
    window.search = (keyword: string) => this.setState({ keyword: keyword });
  }

  componentDidUpdate(): void {
    if (window.tabIndex !== 2) return;

    // check if the driver is changed
    if (this.driver !== window.raito.selectedDriver?.identifier) {
      // scroll back to the top
      if (this.content) {
        this.content.scrollTop = 0;
      }

      if (
        !window.raito.selectedDriver?.supportedCategories.includes(
          this.state.catergory
        )
      ) {
        this.setState({ catergory: "" });
      }

      // update the cached driver
      this.driver = window.raito.selectedDriver?.identifier;
      this.forceUpdate();
      return;
    }

    // check if any manga fetched
    if (
      window.raito.selectedDriver &&
      !this.state.loading &&
      ((!this.state.keyword &&
        !window.raito.selectedDriver.list[this.state.catergory]) ||
        (this.state.keyword &&
          !window.raito.selectedDriver.search[this.state.keyword]))
    ) {
      this.loadMore();
    }
  }

  // show loader when loading list
  async loadMore() {
    if (
      !window.raito.selectedDriver ||
      window.raito.selectedDriver.isDown ||
      this.state.loading ||
      !this.content
    )
      return;

    // show the loader
    this.setState({ loading: true }, () => {
      // scroll to bottom
      this.content!.scrollTo({
        top: this.content!.scrollHeight - this.content!.clientHeight,
        behavior: "smooth",
      });
    });

    var reached: boolean = false;

    // check if search mode is enabled
    if (this.state.keyword) {
      reached = !(await window.raito.selectedDriver!.getSearch(
        this.state.keyword,
        window.raito.selectedDriver!.search[this.state.keyword]
          ? Object.keys(window.raito.selectedDriver!.search[this.state.keyword])
              .length + 1
          : 1
      ));
    } else {
      reached = !(await window.raito.selectedDriver!.getList(
        this.state.catergory,
        window.raito.selectedDriver!.list[this.state.catergory]
          ? Object.keys(window.raito.selectedDriver!.list[this.state.catergory])
              .length + 1
          : 1
      ));
    }

    this.setState({ loading: false }, () => {
      if (!reached) {
        // check if scrollable
        this.shouldLoadMore();
      }
    });
  }

  shouldLoadMore() {
    if (!this.content) return;
    const element = this.content;

    // check if reached the bottom or not scrollable
    if (
      element.scrollHeight - element.scrollTop === element.clientHeight ||
      (window.innerWidth > window.innerHeight &&
        element.clientHeight < window.innerHeight - convertRemToPixels(5))
    ) {
      this.loadMore();
    }
  }

  setCatergory(catergory: string) {
    this.setState({ catergory: catergory, keyword: null });

    // scroll back to the top
    if (this.content) {
      this.content.scrollTop = 0;
    }
  }

  render(): React.ReactNode {
    const isVertical = window.innerWidth < window.innerHeight;

    var manga: Array<SimpleManga> = [];
    // check if search mode is enabled
    if (this.state.keyword) {
      if (window.raito.selectedDriver?.search[this.state.keyword]) {
        for (const page in window.raito.selectedDriver.search[
          this.state.keyword
        ]) {
          for (const id of window.raito.selectedDriver.search[
            this.state.keyword
          ][page]) {
            manga.push(window.raito.selectedDriver.simpleManga[id]);
          }
        }
      }
    } else if (window.raito.selectedDriver?.list[this.state.catergory]) {
      for (const page in window.raito.selectedDriver.list[
        this.state.catergory
      ]) {
        for (const id of window.raito.selectedDriver.list[this.state.catergory][
          page
        ]) {
          manga.push(window.raito.selectedDriver.simpleManga[id]);
        }
      }
    }

    return (
      <div id="libraries">
        {isVertical && <SearchBar keyword={this.state.keyword} />}
        <div id="wrapper">
          <div id="categories">
            {!isVertical && <SearchBar keyword={this.state.keyword} />}
            <ul>
              <li
                onClick={() => this.setCatergory("")}
                className={
                  this.state.catergory || this.state.keyword ? "" : "selected"
                }
              >
                全部
              </li>
              {Object.keys(categories)
                .filter((v) =>
                  window.raito.selectedDriver?.supportedCategories.includes(v)
                )
                .map((v) => (
                  <li
                    key={v}
                    onClick={() => this.setCatergory(v)}
                    className={
                      this.state.catergory === v && !this.state.keyword
                        ? "selected"
                        : ""
                    }
                  >
                    {categories[v]}
                  </li>
                ))}
            </ul>
          </div>
          <div
            id="list"
            onScroll={() => this.shouldLoadMore()}
            ref={(ref) => (this.content = ref)}
          >
            {!this.state.loading && !manga.length && (
              <p id="noMatchManga">沒有符合條件的漫畫</p>
            )}
            <div id="content">
              {manga.map((manga, index) => (
                <div
                  key={`${manga.driver.identifier}${manga.id}${index}`}
                  onClick={() => manga.pushDetails()}
                  className="manga"
                >
                  {manga.isEnd && <div className="end">完結</div>}
                  {window.raito.settingsState.debugMode && (
                    <>
                      <div className="mangaID">{manga.id}</div>
                    </>
                  )}
                  <LazyImage src={manga.thumbnail} />
                  <p>{window.raito.translate(manga.title)}</p>
                  <p className="latest">
                    更新至 {window.raito.translate(manga.latest)}
                  </p>
                </div>
              ))}
            </div>
            {this.state.loading && (
              <div id="loader">
                <InfinitySpin width="150" color="var(--color-text)" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

const Libraries: TabScreen = {
  tab: <LibrariesTab />,
  tabState: <LibrariesTabState />,
  name: "書庫",
};

export default Libraries;
export { categories };
