import React from "react";
import Icon from "@mdi/react";
import { mdiBookArrowRight } from "@mdi/js";
import { liveQuery } from "dexie";

import { convertRemToPixels } from "../../util";
import { db } from "../../db";
import "./history.css";
import { SimpleManga } from "../../BetterMangaApp";

class History extends React.Component {
  constructor(props) {
    super(props);

    this.page = 0;
    this.state = {
      history: [],
    };
  }

  componentDidMount() {
    window.init[1] = async () => {
      if (this.init) return;
      this.init = true;

      liveQuery(() => db.history.toArray()).subscribe((result) =>
        this.setState(
          {
            history: result.sort((a, b) => b.datetime - a.datetime),
          },
          () => {
            (async () => {
              await this.load();
              this.forceUpdate();
            })();
          }
        )
      );
    };
  }

  load = async () =>
    await window.betterMangaApp.getManga(
      this.state.history
        .slice(10 * this.page, 10 * (this.page + 1))
        .map((v) => SimpleManga.fromJSON(v))
    );

  // TODO
  async loadMore() {
    if (this.loading) return;
    this.loading = true;

    this.page += 1;
    await this.load();

    this.loading = false;
    this.forceUpdate();
  }

  async startReading(history, manga) {
    if (this.loading) return;
    this.loading = true;

    window.showLoader();
    const details = await manga.toDetails();
    this.loading = false;

    try {
      if (history?.episode) {
        const index = (
          history?.isExtra ? details.episodes.extra : details.episodes.serial
        )?.indexOf(history.episode);

        if (index !== -1) {
          window.read(details, index, history.isExtra, history.page);
        }
      } else if (details.episodes.serial.length) {
        window.read(details, details.episodes.serial.length - 1, false);
      } else {
        window.read(details, details.episodes.extra.length - 1, true);
      }
    } catch (e) {
      window.hideLoader();
    }
  }

  render() {
    const targetWidth = 500;
    const getWidth = () => {
      const width = window.innerWidth - convertRemToPixels(2);
      const columnCount = Math.round(width / targetWidth);
      return [
        (width - convertRemToPixels(1) * (columnCount - 1)) / columnCount,
        columnCount,
      ];
    };
    const [width, columnCount] = getWidth();

    var historyElem = [];
    for (var i = 0; i < this.page * 10 + 10; i++) {
      if (!this.state.history[i]) break;

      const history = this.state.history[i];
      const driver = window.betterMangaApp.getDriver(history.driver);
      const manga = driver.getCachedManga(history.id);

      historyElem.push(
        <li key={`${history.driver}${history.id}`}>
          <div className="info" onClick={() => window.showDetails(manga)}>
            <img src={manga?.thumbnail} alt={manga?.thumbnail} />
            <div>
              <h2>{window.betterMangaApp.translate(manga?.title)}</h2>
              <h3>
                {history.episode ? (
                  <>
                    上次看到{" "}
                    <i>
                      {window.betterMangaApp.translate(history.episode)} 第
                      {history.page}頁
                    </i>
                  </>
                ) : (
                  <>未看</>
                )}
              </h3>
              <h4>更新到 {window.betterMangaApp.translate(manga?.latest)}</h4>
            </div>
          </div>
          <div
            className="continue"
            onClick={() => this.startReading(history, manga)}
          >
            <Icon path={mdiBookArrowRight} size={1.5} />
            續看
          </div>
        </li>
      );
    }

    return (
      <div className="history">
        <ul
          style={{
            gridTemplateColumns: Array(columnCount)
              .fill(`${width}px`)
              .join(" "),
          }}
        >
          {historyElem}
        </ul>
      </div>
    );
  }
}

export default History;
