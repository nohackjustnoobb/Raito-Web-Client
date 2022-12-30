import React from "react";
import Icon from "@mdi/react";
import { mdiMagnify } from "@mdi/js";

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
        },
        () => {
          (async () => {
            await window.betterMangaApp.getCategories(
              window.betterMangaApp.selectedDriver
            );
            this.setState({ loading: false });
          })();

          (async () => {
            await window.betterMangaApp.getList(
              window.betterMangaApp.selectedDriver,
              this.state.selected,
              1
            );
            this.setState({ listLoading: false });
          })();
        }
      );
    };
  }

  async select(v) {
    this.setState(
      {
        listLoading: true,
        pageLoading: false,
        page: 1,
        selected: v,
      },
      async () => {
        await window.betterMangaApp.getList(
          window.betterMangaApp.selectedDriver,
          v,
          this.state.page
        );

        this.setState({ listLoading: false });
      }
    );
  }

  async onScroll(e) {
    const bottom =
      Math.abs(
        e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight
      ) < 50;

    if (bottom && !this.pageLoading) {
      this.pageLoading = true;
      this.setState(
        {
          pageLoading: true,
          page: this.state.page + 1,
        },
        async () => {
          await window.betterMangaApp.getList(
            window.betterMangaApp.selectedDriver,
            this.state.selected,
            this.state.page
          );
          this.setState(
            { pageLoading: false },
            () => (this.pageLoading = false)
          );
        }
      );
    }
  }

  render() {
    const convertRemToPixels = (rem) =>
      rem * parseFloat(getComputedStyle(document.documentElement).fontSize);

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
          window.betterMangaApp.list[
            `${window.betterMangaApp.selectedDriver}${this.state.selected}${i}`
          ];

        if (list) {
          result.push(
            ...list.map(
              (v) =>
                window.betterMangaApp.simpleManga[
                  `${window.betterMangaApp.selectedDriver}${v}`
                ]
            )
          );
        }
      }
      return result;
    };

    const isPhone = window.innerWidth < window.innerHeight;
    const targetWidth = 150;
    const [width, columnCount, listWidth] = getWidth();

    const search = (
      <div id="search">
        <input style={{ width: `calc(100% - ${isPhone ? 3 : 1}rem)` }} />
        <Icon
          path={mdiMagnify}
          size={1}
          color={"#999999"}
          style={{
            position: "absolute",
            right: isPhone ? "3.5rem" : "1.5rem",
            top: ".25rem",
          }}
        />
      </div>
    );

    return (
      <div id="library">
        {this.state.loading ? (
          <div className="center">
            <div className="loader" />
          </div>
        ) : (
          <>
            {isPhone ? search : <></>}
            <div
              id="content"
              style={{ height: `calc(100% - ${isPhone ? 3.25 : 0}rem)` }}
            >
              <ul id="categories" style={{ width: `${isPhone ? 5 : 10}rem` }}>
                {isPhone ? <></> : search}
                <li
                  onClick={() => this.select(undefined)}
                  className={this.state.selected ? "" : "selected"}
                >
                  全部
                </li>
                {window.betterMangaApp.categories[
                  window.betterMangaApp.selectedDriver
                ].map((v) => (
                  <li
                    onClick={() => this.select(v)}
                    className={this.state.selected === v ? "selected" : ""}
                  >
                    {categories[v]}
                  </li>
                ))}
              </ul>
              {this.state.listLoading ? (
                <div
                  className="center"
                  style={{ width: `calc(100vw - ${isPhone ? 7 : 12}rem)` }}
                >
                  <div className="loader" />
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
                    {getList().map((v) => (
                      <li
                        key={`${v.driver}${v.id}`}
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
                      <div className="loader" />
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
