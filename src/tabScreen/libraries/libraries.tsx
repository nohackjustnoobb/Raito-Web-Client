import React from "react";
import Icon from "@mdi/react";
import { mdiChevronDown, mdiDatabase, mdiMagnify } from "@mdi/js";

import TabScreen from "../tabScreen";
import "./libraries.scss";
import { InfinitySpin } from "react-loader-spinner";
import { convertRemToPixels } from "../../utils/utils";
import { SimpleManga } from "../../classes/manga";

const categories: { [category: string]: string } = {
  Passionate: "熱血",
  Love: "戀愛",
  Campus: "校園",
  Yuri: "百合",
  "Cross-Dressing": "偽娘",
  BL: "甲甲",
  Adventure: "冒險",
  Harem: "后宮",
  "Sci-Fi": "科幻",
  War: "戰爭",
  Suspense: "懸疑",
  Speculation: "推理",
  Funny: "搞笑",
  Fantasy: "奇幻",
  Magic: "魔法",
  Horror: "恐怖",
  Ghosts: "神鬼",
  History: "歷史",
  "Fan-Fi": "同人",
  Sports: "運動",
  Hentai: "Hentai",
  Mecha: "機甲",
  Restricted: "R18",
};

class LibrariesTabState extends React.Component {
  componentDidMount() {
    // register for update events
    window.FUM.register(this.forceUpdate.bind(this));
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
          defaultValue={window.BMA.selectedDriver?.identifier}
          onChange={async (event) => {
            // change the selected driver
            await window.BMA.selectDriver(event.target.value);
          }}
        >
          {window.BMA.availableDrivers?.map((v) => (
            <option key={v.identifier}>{v.identifier}</option>
          ))}
        </select>
        <Icon path={mdiChevronDown} size={0.75} />
      </div>
    );
  }
}

class SearchBar extends React.Component<
  {},
  { keyword: string; suggestions: Array<string> | undefined; focus: boolean }
> {
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(props: {}) {
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
                  suggestions: await window.BMA.selectedDriver?.getSuggestions(
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
                  this.setState({ keyword: window.BMA.translate(suggestion) });
                  window.search(suggestion);
                }}
              >
                <span>{window.BMA.translate(suggestion)}</span>
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
    window.FUM.register(this.forceUpdate.bind(this));

    // update the ui when the page hide or show
    document.addEventListener("visibilitychange", () =>
      setTimeout(() => this.forceUpdate(), 250)
    );

    // set global variable for searching
    window.search = (keyword: string) => this.setState({ keyword: keyword });

    // update the component
    this.forceUpdate();
  }

  componentDidUpdate(): void {
    // check if the driver is changed
    if (this.driver !== window.BMA.selectedDriver?.identifier) {
      // scroll back to the top
      if (this.content) {
        this.content.scrollTop = 0;
      }

      if (
        !window.BMA.selectedDriver?.categories.includes(this.state.catergory)
      ) {
        this.setState({ catergory: "" });
      }

      // update the cached driver
      this.driver = window.BMA.selectedDriver?.identifier;
      this.forceUpdate();
      return;
    }

    // check if any manga fetched
    if (
      window.BMA.selectedDriver &&
      !this.state.loading &&
      ((!this.state.keyword &&
        !window.BMA.selectedDriver.list[this.state.catergory]) ||
        (this.state.keyword &&
          !window.BMA.selectedDriver.search[this.state.keyword]))
    ) {
      this.loadMore();
    }
  }

  // show loader when loading list
  async loadMore() {
    if (!window.BMA.selectedDriver || this.state.loading || !this.content)
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
      reached = !(await window.BMA.selectedDriver!.loadSearch(
        this.state.keyword,
        window.BMA.selectedDriver!.search[this.state.keyword]
          ? Object.keys(window.BMA.selectedDriver!.search[this.state.keyword])
              .length + 1
          : 1
      ));
    } else {
      reached = !(await window.BMA.selectedDriver!.loadList(
        this.state.catergory,
        window.BMA.selectedDriver!.list[this.state.catergory]
          ? Object.keys(window.BMA.selectedDriver!.list[this.state.catergory])
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
      if (window.BMA.selectedDriver?.search[this.state.keyword]) {
        for (const page in window.BMA.selectedDriver.search[
          this.state.keyword
        ]) {
          for (const id of window.BMA.selectedDriver.search[this.state.keyword][
            page
          ]) {
            manga.push(window.BMA.selectedDriver.simpleManga[id]);
          }
        }
      }
    } else if (window.BMA.selectedDriver?.list[this.state.catergory]) {
      for (const page in window.BMA.selectedDriver.list[this.state.catergory]) {
        for (const id of window.BMA.selectedDriver.list[this.state.catergory][
          page
        ]) {
          manga.push(window.BMA.selectedDriver.simpleManga[id]);
        }
      }
    }

    return (
      <div id="libraries">
        {isVertical && <SearchBar />}
        <div id="wrapper">
          <div id="categories">
            {!isVertical && <SearchBar />}
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
                  window.BMA.selectedDriver?.categories.includes(v)
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
              {manga.map((manga) => (
                <div
                  key={`${manga.driver.identifier}${manga.id}`}
                  onClick={() => manga.pushDetails()}
                  className="manga"
                >
                  {manga.isEnd && <div className="end">完結</div>}
                  {window.BMA.settingsState.debugMode && (
                    <>
                      <div className="mangaID">{manga.id}</div>
                    </>
                  )}
                  <img src={manga.thumbnail} alt={manga.thumbnail} />
                  <p>{window.BMA.translate(manga.title)}</p>
                  <p className="latest">
                    更新至 {window.BMA.translate(manga.latest)}
                  </p>
                </div>
              ))}
            </div>
            {this.state.loading && (
              <div id="loader">
                <InfinitySpin width="150" color="#000" />
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
