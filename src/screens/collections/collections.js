import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db";
import { SimpleManga } from "../../BetterMangaApp";
import { useEffect } from "react";

import { convertRemToPixels, useForceUpdate } from "../../util";
import "./collections.css";

function Collections() {
  const collections = useLiveQuery(() => db.collections.toArray());
  const history = useLiveQuery(() => db.history.toArray());
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    window.addEventListener("resize", () => forceUpdate());
    window.addEventListener("orientationchange", () => forceUpdate());
    window.forceUpdate[0] = () => forceUpdate();
  });

  const getWidth = () => {
    const targetWidth = 150;

    const width = window.innerWidth - convertRemToPixels(2);

    const columnCount = Math.round(width / targetWidth);
    return [
      (width - convertRemToPixels(1) * (columnCount - 1)) / columnCount,
      columnCount,
    ];
  };

  const [width, columnCount] = getWidth();

  var sortedCollections = [];
  if (collections && history) {
    sortedCollections = [...collections];
    sortedCollections.sort((v1, v2) => {
      const v1History = history.find(
        (w) => w.driver === v1.driver && w.id === v1.id
      );
      const v2History = history.find(
        (w) => w.driver === v2.driver && w.id === v2.id
      );

      return v2History?.datetime - v1History?.datetime;
    });
  }

  return (
    <div className="collections">
      {collections?.length === 0 ? (
        <p className="noCollections">沒有收藏</p>
      ) : (
        <div className="container">
          <ul
            style={{
              gridTemplateColumns: Array(columnCount)
                .fill(`${width}px`)
                .join(" "),
            }}
          >
            {sortedCollections.map((v) => {
              if (!history?.length) return <></>;
              const vHistory = history.find(
                (w) => w.driver === v.driver && w.id === v.id
              );

              return (
                <li
                  key={`${v.driver}${v.id}`}
                  style={{ width: width }}
                  onClick={() => window.showDetails(SimpleManga.fromJSON(v))}
                >
                  {v.isEnd ? (
                    <div className="end">完結</div>
                  ) : vHistory?.latest && v.latest === vHistory.latest ? (
                    <></>
                  ) : (
                    <div className="new">更新</div>
                  )}
                  <img src={v.thumbnail} alt={v.thumbnail} width={width} />
                  <p>{window.betterMangaApp.translate(v.title)}</p>
                  <p className="simpleHistory">
                    {vHistory?.episode
                      ? window.betterMangaApp.translate(vHistory.episode)
                      : "未看"}{" "}
                    / {window.betterMangaApp.translate(v.latest)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Collections;
