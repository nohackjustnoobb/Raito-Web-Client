import React from "react";
import Icon from "@mdi/react";
import { mdiMagnify } from "@mdi/js";
import { InfinitySpin } from "react-loader-spinner";

import { convertRemToPixels } from "../../util";
import "./library.css";

const categories = {
  Passionate: "熱血",
  Love: "戀愛",
  Campus: "校園",
  Yuri: "百合",
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
  "Cross-Dressing": "偽娘",
};

class Search extends React.Component {
  constructor(props) {
    super(props);

    this.state = { suggestion: [], focus: false };
  }

  searchChange(e) {
    this.search = e.target.value;
    if (!this.search) return this.setState({ suggestion: [] });

    const cacheValue = e.target.value;
    setTimeout(async () => {
      if (this.search && this.search === cacheValue) {
        if (this.loading) return;
        this.loading = true;
        this.setState(
          {
            suggestion:
              await window.betterMangaApp.selectedDriver.getSuggestion(
                this.search
              ),
          },
          () => (this.loading = false)
        );
      }
    }, 1000);
  }

  render() {
    return (
      <div id="search">
        <input
          enterkeyhint="search"
          onChange={(e) => this.searchChange(e)}
          onFocus={() => this.setState({ focus: true })}
          onBlur={() => setTimeout(() => this.setState({ focus: false }), 100)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.target.blur();
              window.search(this.search);
            }
          }}
        />
        <Icon
          path={mdiMagnify}
          size={1}
          color={"#999999"}
          className="icon"
          onClick={() => window.search(this.search)}
        />
        {this.state.focus && this.state.suggestion.length ? (
          <ul>
            {this.state.suggestion.map((v, i) => (
              <li key={i} onClick={() => window.search(v)}>
                {window.betterMangaApp.translate(v)}
              </li>
            ))}
          </ul>
        ) : (
          <></>
        )}
      </div>
    );
  }
}

class Library extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      init: false,
      selected: undefined,
      listLoading: true,
      pageLoading: false,
      page: 1,
      search: [],
    };
  }

  componentDidMount() {
    window.addEventListener("resize", () => this.forceUpdate());
    window.addEventListener("orientationchange", () => this.forceUpdate());

    window.init[2] = (force = false) => {
      if (this.state.init && !force) return;
      this.setState(
        {
          init: true,
          loading: true,
          listLoading: true,
          pageLoading: false,
          page: 1,
          search: [],
        },
        () => {
          (async () => {
            await window.betterMangaApp.selectedDriver.getCategories();
            this.setState({ loading: false });
          })();

          (async () => {
            await window.betterMangaApp.selectedDriver.getList(
              this.state.selected,
              1
            );
            this.setState({ listLoading: false });
          })();
        }
      );
    };
    window.search = async (text) => {
      if (!text || this.loading) return;
      window.setPage(2);

      this.loading = true;
      this.setState({ listLoading: true });

      this.searchText = text;
      const result = await window.betterMangaApp.selectedDriver.search(text);
      this.setState({ search: result, listLoading: false }, () => {
        this.loading = false;
        this.ensureScrollable();
      });
    };
  }

  async select(v) {
    this.setState(
      {
        listLoading: true,
        pageLoading: false,
        page: 1,
        selected: v,
        search: [],
      },
      async () => {
        await window.betterMangaApp.selectedDriver.getList(v, this.state.page);

        this.setState({ listLoading: false });
      }
    );
  }

  async onScroll(e, force = false) {
    const bottom = force
      ? undefined
      : Math.abs(
          e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight
        ) < 50;

    if ((bottom && !this.pageLoading) || force) {
      this.pageLoading = true;
      this.setState(
        {
          pageLoading: true,
          page: this.state.page + 1,
        },
        async () => {
          if (this.state.search.length) {
            const result = await window.betterMangaApp.selectedDriver.search(
              this.searchText,
              this.state.page
            );
            if (!result.length) throw new Error("");

            this.setState({
              search: [...this.state.search, ...result],
            });
          } else {
            await window.betterMangaApp.selectedDriver.getList(
              this.state.selected,
              this.state.page
            );
          }
          this.setState(
            { pageLoading: false },
            () => (this.pageLoading = false)
          );
        }
      );
    }
  }

  async ensureScrollable() {
    const container = document.getElementById("list");
    const list = container.getElementsByTagName("ul")[0];

    if (list.scrollHeight < container.clientHeight) {
      const cacheLength = this.state.search.length;
      await this.onScroll(undefined, true);
      if (cacheLength === this.state.search.length) return;

      await this.ensureScrollable();
    }
  }

  render() {
    const getWidth = () => {
      const width =
        window.innerWidth -
        convertRemToPixels(3) -
        convertRemToPixels(isPhone ? 5 : 10);

      const columnCount = Math.round(width / targetWidth);
      return [
        (width - convertRemToPixels(1) * (columnCount - 1)) / columnCount,
        columnCount,
        width,
      ];
    };

    const getList = () => {
      var result = [];
      for (var i = 1; i <= this.state.page; i++) {
        const list =
          window.betterMangaApp.selectedDriver.list[
            `${this.state.selected}${i}`
          ];

        if (list) {
          result.push(
            ...list.map((v) =>
              window.betterMangaApp.selectedDriver.getCachedManga(v, false)
            )
          );
        }
      }
      return result;
    };

    const isPhone = window.innerWidth < window.innerHeight;
    const targetWidth = 150;
    const [width, columnCount, listWidth] = getWidth();

    return (
      <div id="library">
        {this.state.loading ? (
          <div className="center">
            <InfinitySpin width="200" color="#000" />
          </div>
        ) : (
          <>
            {isPhone ? (
              <div className="searchContainer">{<Search />}</div>
            ) : (
              <></>
            )}
            <div
              id="content"
              style={{ height: `calc(100% - ${isPhone ? 3.25 : 0}rem)` }}
            >
              <div>
                {isPhone ? <></> : <Search />}
                <ul
                  id="categories"
                  style={{
                    width: `${isPhone ? 5 : 10}rem`,
                    height: isPhone ? "100%" : "cal(100% - 3.25rem)",
                  }}
                >
                  <li
                    onClick={() => this.select(undefined)}
                    className={
                      this.state.selected || this.state.search.length
                        ? ""
                        : "selected"
                    }
                  >
                    全部
                  </li>
                  {window.betterMangaApp.selectedDriver.categories.map((v) => (
                    <li
                      key={v}
                      onClick={() => this.select(v)}
                      className={
                        this.state.selected === v && !this.state.search.length
                          ? "selected"
                          : ""
                      }
                    >
                      {categories[v]}
                    </li>
                  ))}
                </ul>
              </div>
              {this.state.listLoading ? (
                <div
                  className="center"
                  style={{ width: `calc(100vw - ${isPhone ? 7 : 12}rem)` }}
                >
                  <InfinitySpin width="150" color="#000" />
                </div>
              ) : (
                <div id="list" onScroll={(e) => this.onScroll(e)}>
                  <ul
                    style={{
                      gridTemplateColumns: Array(columnCount)
                        .fill(`${width}px`)
                        .join(" "),
                      width: listWidth,
                    }}
                  >
                    {(this.state.search.length
                      ? this.state.search
                      : getList()
                    ).map((v) => (
                      <li
                        key={`${v.driver.identifier}${v.id}`}
                        style={{ width: width }}
                        onClick={() => window.showDetails(v)}
                      >
                        {v.isEnd ? <div className="end">完結</div> : <></>}
                        <img
                          src={v.thumbnail}
                          alt={v.thumbnail}
                          width={width}
                        />
                        <p>{window.betterMangaApp.translate(v.title)}</p>
                        <p className="latest">
                          更新至 {window.betterMangaApp.translate(v.latest)}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {this.state.pageLoading ? (
                    <div className="pageLoader">
                      <InfinitySpin width="150" color="#000" />
                    </div>
                  ) : (
                    <></>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }
}

export default Library;
export { categories };
