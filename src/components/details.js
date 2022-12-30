import React from "react";
import Icon from "@mdi/react";
import { mdiClose, mdiStar, mdiStarOffOutline } from "@mdi/js";
import { liveQuery } from "dexie";

import "./details.css";
import { categories } from "./library";
import { db } from "../db";

class Background extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      opacity: 0,
    };
  }

  componentDidMount() {
    this.interval = setInterval(() => {
      function f(x) {
        if (x < 0.8) return 0;
        return 1 - (0.2 - x) / 0.2;
      }

      if (this.props?.contentRef?.current) {
        const height = this.props.contentRef.current.offsetHeight;
        const position = window
          .getComputedStyle(this.props.contentRef.current)
          .transform.split(", ")
          .pop()
          .slice(0, -1);

        var opacity = f((height - position) / height);
        if (isNaN(opacity)) opacity = 0;

        if (opacity !== this.state.opacity) {
          this.setState({ opacity: opacity });
        }
      }
    });
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    return (
      <div className="background" style={{ opacity: this.state.opacity }}>
        <div className="close" onClick={() => this.props.close()}>
          <Icon path={mdiClose} size={1.5} color={"white"} />
        </div>
        <img src={this.props?.thumbnail} alt={this.props?.thumbnail} />
      </div>
    );
  }
}

class Details extends React.Component {
  constructor(props) {
    super(props);

    this.episodesRef = React.createRef();
    this.contentRef = React.createRef();

    this.state = {
      show: false,
      display: "none",
      extra: false,
      loading: false,
      collected: null,
      history: null,
    };
  }

  close() {
    this.setState({ show: false });
    setTimeout(() => this.setState({ display: "none" }), 300);
  }

  toggleCollect() {
    if (this.state.collected) {
      this.details.remove();
    } else {
      this.details.add();
    }
  }

  read(episode) {
    window.read(this.details, episode, this.state.extra);
  }

  componentDidMount() {
    window.addEventListener("resize", () => this.forceUpdate());
    window.addEventListener("orientationchange", () => this.forceUpdate());

    window.showDetails = async (manga) => {
      if (this.loading) return;

      this.loading = true;
      this.setState({ loading: true });

      this.details = await manga.toDetails();

      liveQuery(() =>
        db.collections.get({
          driver: this.details?.driver,
          id: this.details?.id,
        })
      ).subscribe((result) => this.setState({ collected: Boolean(result) }));

      liveQuery(() =>
        db.history.get({
          driver: this.details?.driver,
          id: this.details?.id,
        })
      ).subscribe((result) => this.setState({ history: result }));

      this.setState(
        {
          display: "block",
          loading: false,
          extra: this.details.episodes.serial.length === 0,
        },
        () => {
          this.loading = false;
          setTimeout(() => this.setState({ show: true, pageY: 0 }), 50);
        }
      );
    };
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
            <Background
              close={() => this.close()}
              thumbnail={this.details?.thumbnail}
              contentRef={this.contentRef}
            />
            <div
              className="content"
              ref={this.contentRef}
              style={
                this.state.show
                  ? { transform: [`translateY(${-this.state.pageY * 2}px)`] }
                  : {}
              }
            >
              <div
                className="closeBar"
                onTouchStart={(e) => {
                  this.startY = e.touches[0].pageY;
                  if (this.contentRef.current) {
                    this.contentRef.current.style.transitionDuration = "0s";
                  }
                }}
                onTouchMove={(e) => {
                  if (this.contentRef.current) {
                    this.contentRef.current.style.transform = `translateY(${
                      (e.touches[0].pageY - this.startY) * 2
                    }px)`;
                  }
                }}
                onTouchEnd={(e) => {
                  this.contentRef.current.style.transitionDuration = "0.3s";
                  if (this.startY - e.nativeEvent.pageY < -this.startY * 0.3) {
                    this.close();
                  } else {
                    this.contentRef.current.style.transform = "translateY(0)";
                  }
                }}
              >
                <div />
              </div>
              <ul className="categories">
                {this.details?.categories?.map((v) => (
                  <li>{categories[v]}</li>
                ))}
              </ul>
              <h1 className="title">{this.details?.title}</h1>
              <ul className="author">
                {this.details?.author?.map((v) => (
                  <li>{window.betterMangaApp.translate(v)}</li>
                ))}
              </ul>
              <p className="description">
                {window.betterMangaApp.translate(this.details?.description)}
              </p>
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
                  )?.map((v, i) => (
                    <li onClick={() => this.read(i)}>
                      <p>{window.betterMangaApp.translate(v)}</p>
                    </li>
                  ))
                ) : (
                  <></>
                )}
              </ul>
              <div className="options">
                <div
                  className={this.state.collected ? "collect" : "notCollect"}
                  onClick={() => this.toggleCollect()}
                >
                  <Icon
                    path={this.state.collected ? mdiStarOffOutline : mdiStar}
                    size={1.5}
                  />
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
                <h1 className="title desktopTitle">
                  {window.betterMangaApp.translate(this.details?.title)}
                </h1>
                <ul className="author">
                  {this.details?.author?.map((v) => (
                    <li>{window.betterMangaApp.translate(v)}</li>
                  ))}
                </ul>
                <p className="description desktopDescription">
                  {window.betterMangaApp.translate(this.details?.description)}
                </p>

                <div className="options desktopOptions">
                  <div
                    className={this.state.collected ? "collect" : "notCollect"}
                    onClick={() => this.toggleCollect()}
                  >
                    <Icon
                      path={this.state.collected ? mdiStarOffOutline : mdiStar}
                      size={1.5}
                    />
                  </div>
                  <div className="read">
                    {this.state.history?.episode ? "繼續" : "開始"}閱讀
                  </div>
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
                    )?.map((v, i) => (
                      <li onClick={() => this.read(i)}>
                        <p>{window.betterMangaApp.translate(v)}</p>
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
