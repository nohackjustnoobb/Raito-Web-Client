import React from "react";
import Icon from "@mdi/react";
import { mdiClose, mdiStarOutline } from "@mdi/js";

import "./details.css";
import { categories } from "./library";

class Details extends React.Component {
  constructor(props) {
    super(props);
    this.episodesRef = React.createRef();
    this.state = {
      show: false,
      display: "none",
      background: false,
      extra: false,
      loading: false,
    };
  }

  close() {
    this.setState({ show: false, background: false });
    setTimeout(() => this.setState({ display: "none" }), 300);
  }

  componentDidMount() {
    window.addEventListener("resize", () => this.forceUpdate());
    window.showDetails = async (manga) => {
      if (this.loading) return;

      this.loading = true;
      this.setState({ loading: true });
      this.details = window.betterMangaApp.translateManga(
        await window.betterMangaApp.toDetails(manga)
      );

      this.setState({ display: "block", loading: false }, () => {
        this.loading = false;
        setTimeout(() => this.setState({ show: true }), 50);
        setTimeout(() => this.setState({ background: true }), 150);
      });
    };
  }

  componentWillUnmount() {
    window.removeEventListener("resize", () => this.forceUpdate());
  }

  render() {
    const convertRemToPixels = (rem) =>
      rem * parseFloat(getComputedStyle(document.documentElement).fontSize);

    const isPhone = window.innerWidth < window.innerHeight;
    const targetWidth = 100;

    function getWidth() {
      const width =
        window.innerWidth * (isPhone ? 1 : 0.7) -
        convertRemToPixels(isPhone ? 2 : 3);
      const columnCount = Math.round(width / targetWidth);
      return [
        (width - convertRemToPixels(1) * (columnCount - 1)) / columnCount,
        columnCount,
      ];
    }

    const [width, columnCount] = getWidth();
    var offsetTop = 0;
    var current = this.episodesRef?.current;
    while (current) {
      offsetTop += current.offsetTop;
      current = current.offsetParent;
    }

    console.log(offsetTop);

    return (
      <>
        <div
          style={{ display: this.state.loading ? "flex" : "none" }}
          className={"loading"}
        >
          <div>
            <div className="loader" />
          </div>
        </div>
        {isPhone ? (
          <div className={"details"} style={{ display: this.state.display }}>
            <div
              className="background"
              style={this.state.background ? { opacity: 1 } : {}}
            >
              <div className="close" onClick={() => this.close()}>
                <Icon path={mdiClose} size={1.5} color={"white"} />
              </div>
              <img
                src={this.details?.thumbnail}
                alt={this.details?.thumbnail}
              />
            </div>
            <div
              className={`content`}
              style={this.state.show ? { transform: ["translateY(0)"] } : {}}
            >
              <ul className="categories">
                {this.details?.categories?.map((v) => (
                  <li>{categories[v]}</li>
                ))}
              </ul>
              <h1 className="title">{this.details?.title}</h1>
              <ul className="author">
                {this.details?.author?.map((v) => (
                  <li>{v}</li>
                ))}
              </ul>
              <p className="description">{this.details?.description}</p>
              <div className="status">
                <h2 className="isEnd">
                  {this.details?.isEnd ? "完結" : "連載中"}
                </h2>
                {this.details?.episodes.extra.length === 0 ? (
                  <></>
                ) : (
                  <div
                    className="extra"
                    onClick={() => this.setState({ extra: !this.state.extra })}
                    style={
                      this.state.extra
                        ? { color: "white", backgroundColor: "#575757" }
                        : {}
                    }
                  >
                    番外
                  </div>
                )}
              </div>
              <ul
                ref={this.episodesRef}
                className="episodes"
                style={{
                  gridTemplateColumns: Array(columnCount)
                    .fill(`${width}px`)
                    .join(" "),
                  maxHeight:
                    window.innerHeight - offsetTop - convertRemToPixels(5),
                }}
              >
                {this.details?.episodes ? (
                  (this.state.extra
                    ? this.details.episodes.extra
                    : this.details.episodes.serial
                  )?.map((v) => (
                    <li>
                      <p>{v}</p>
                    </li>
                  ))
                ) : (
                  <></>
                )}
              </ul>
              <div className="options">
                <div className="collect">
                  <Icon path={mdiStarOutline} size={1.5} />
                </div>
                <div className="read">開始閱讀</div>
              </div>
            </div>
          </div>
        ) : (
          <div className={"details"} style={{ display: this.state.display }}>
            <div
              className={`content desktopContent`}
              style={this.state.show ? { transform: ["translateY(0)"] } : {}}
            >
              <div className="close" onClick={() => this.close()}>
                <Icon path={mdiClose} size={1.5} color={"white"} />
              </div>
              <div>
                <img
                  src={this.details?.thumbnail}
                  alt={this.details?.thumbnail}
                />
                <ul className="categories">
                  {this.details?.categories?.map((v) => (
                    <li>{categories[v]}</li>
                  ))}
                </ul>
                <h1 className="title desktopTitle">{this.details?.title}</h1>
                <ul className="author">
                  {this.details?.author?.map((v) => (
                    <li>{v}</li>
                  ))}
                </ul>
                <p className="description desktopDescription">
                  {this.details?.description}
                </p>

                <div className="options desktopOptions">
                  <div className="collect">
                    <Icon path={mdiStarOutline} size={1.5} />
                  </div>
                  <div className="read">開始閱讀</div>
                </div>
              </div>
              <div className="desktopEpisodes">
                <div className="status">
                  <h2 className="isEnd">
                    {this.details?.isEnd ? "完結" : "連載中"}
                  </h2>
                  {this.details?.episodes.extra.length === 0 ? (
                    <></>
                  ) : (
                    <div
                      className="extra"
                      onClick={() =>
                        this.setState({ extra: !this.state.extra })
                      }
                      style={
                        this.state.extra
                          ? { color: "white", backgroundColor: "#575757" }
                          : {}
                      }
                    >
                      番外
                    </div>
                  )}
                </div>
                <ul
                  ref={this.episodesRef}
                  className="episodes"
                  style={{
                    gridTemplateColumns: Array(columnCount)
                      .fill(`${width}px`)
                      .join(" "),
                    maxHeight:
                      window.innerHeight - offsetTop - convertRemToPixels(2),
                  }}
                >
                  {this.details?.episodes ? (
                    (this.state.extra
                      ? this.details.episodes.extra
                      : this.details.episodes.serial
                    )?.map((v) => (
                      <li>
                        <p>{v}</p>
                      </li>
                    ))
                  ) : (
                    <></>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
}

export default Details;
