import React from "react";
import Icon from "@mdi/react";
import Switch from "react-switch";
import RangeSlider from "react-range-slider-input";
import { mdiChevronLeft } from "@mdi/js";

import "react-range-slider-input/dist/style.css";
import "./manga.css";

class PageNumber extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      page: 1,
    };
  }

  updatePage() {
    try {
      const page =
        Number.parseInt(
          document
            .elementFromPoint(window.innerWidth * 0.5, window.innerHeight * 0.5)
            ?.firstChild?.getAttribute("page")
            .split("_")[1]
        ) + 1;

      if (page && page !== this.state.page) this.setState({ page: page });
    } catch (e) {}
  }

  componentDidMount() {
    this.interval = setInterval(() => this.updatePage(), 500);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  scrollTo(page) {
    const elem = document.querySelector(
      `[page="${this.props.episode}_${page - 1}"]`
    );

    if (elem) {
      elem.scrollIntoView();
      this.updatePage();
    }
  }

  render() {
    return (
      <>
        <span>
          <b>{this.state.page}</b>/{this.props.total}
        </span>
        <RangeSlider
          className="single-thumb"
          defaultValue={[1]}
          min={1}
          onInput={(e) => this.scrollTo(e[1])}
          max={this.props.total}
          value={[0, this.state.page]}
          rangeSlideDisabled={true}
          thumbsDisabled={[true, false]}
        />
      </>
    );
  }
}

function Dialog({ message }) {
  return message ? (
    <div className="dialog">
      <div className="message">{message}</div>
    </div>
  ) : (
    <></>
  );
}

class Manga extends React.Component {
  constructor(props) {
    super(props);

    this.mangaImgRef = React.createRef();
    this.mangaRef = React.createRef();
    this.urls = {};
    this.state = {
      episode: null,
      show: false,
      menu: true,
      pageOffset: false,
      loading: false,
      display: "none",
      message: null,
    };
  }

  close() {
    this.urls = {};
    this.manga = undefined;
    this.isExtra = undefined;

    this.setState({ show: false, pageOffset: false, menu: true });
    setTimeout(() => this.setState({ display: "none" }), 300);
  }

  showMessage(message) {
    this.setState({ message: message });
    setTimeout(() => this.setState({ message: null }), 1000);
  }

  async loadMore(e) {
    const elem = this.mangaImgRef.current;
    if (!elem) return;

    const convertRemToPixels = (rem) =>
      rem * parseFloat(getComputedStyle(document.documentElement).fontSize);

    if (e.type === "load" && this.bottom) {
      elem.scrollTo({ top: elem.scrollHeight - this.bottom });
    }

    if (elem?.scrollTop < convertRemToPixels(4)) {
      elem.scrollTo({
        top: convertRemToPixels(4),
        behavior: "instant",
      });

      if (this.loading || e.type === "load") return;

      if (
        this.isExtra
          ? this.state.episode + 1 < this.manga.episodes.extra.length
          : this.state.episode + 1 < this.manga.episodes.serial.length
      ) {
        const episode = this.isExtra
          ? this.state.episode + 1
          : this.state.episode + 1;
        this.loading = true;
        this.urls[episode] = await this.manga.get(episode, this.isExtra);
        this.bottom = elem?.scrollHeight - elem?.scrollTop;
        this.forceUpdate(() => (this.loading = false));
      } else {
        this.showMessage("沒有上一話了");
      }
    }

    if (
      elem?.scrollHeight - elem?.scrollTop - elem?.clientHeight <
      convertRemToPixels(4)
    ) {
      elem.scrollTo({
        top: elem.scrollHeight - elem.clientHeight - convertRemToPixels(4),
        behavior: "instant",
      });
      if (this.loading || e.type === "load") return;

      if (this.state.episode - 1 >= 0) {
        const episode = this.state.episode - 1;
        this.loading = true;
        this.urls[episode] = await this.manga.get(episode, this.isExtra);
        this.bottom = undefined;
        this.forceUpdate(() => (this.loading = false));
      } else {
        this.showMessage("沒有下一話了");
      }
    }
  }

  updateEpisode() {
    try {
      const episode = Number.parseInt(
        document
          .elementFromPoint(window.innerWidth * 0.5, window.innerHeight * 0.5)
          ?.firstChild?.getAttribute("page")
          .split("_")[0]
      );

      if (episode !== this.state.episode) {
        this.setState({ episode: episode });
      }
    } catch (e) {}
  }

  componentDidMount() {
    setInterval(() => this.updateEpisode(), 1000);
    window.addEventListener("resize", () => this.forceUpdate());
    window.addEventListener("orientationchange", () => this.forceUpdate());

    window.read = async (manga, episode, isExtra) => {
      if (this.loading) return;
      this.loading = true;

      this.setState({ episode: episode, loading: true });

      this.manga = manga;
      this.isExtra = isExtra;
      this.urls[episode] = await manga.get(episode, isExtra);

      this.setState(
        { display: "block", loading: false },
        () => (this.loading = false)
      );
      setTimeout(() => this.setState({ show: true }), 50);
    };
  }

  render() {
    const convertRemToPixels = (rem) =>
      rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
    const isPhone = window.innerWidth < window.innerHeight;

    var title = "";
    if (this.manga) {
      title = window.betterMangaApp.translate(
        this.isExtra
          ? this.manga.episodes.extra[this.state.episode]
          : this.manga.episodes.serial[this.state.episode]
      );
    }

    var mangaElement = [];
    for (const [key, value] of Object.entries(this.urls).sort().reverse()) {
      if (
        !window.betterMangaApp.forceTwoPage &&
        (window.betterMangaApp.forceOnePage || isPhone)
      ) {
        mangaElement.push(
          ...value?.map((v, i) => (
            <li key={`${key}_${i}`}>
              <img
                src={v}
                alt={v}
                style={{ width: "100vw" }}
                key={`${key}_${i}`}
                page={`${key}_${i}`}
              />
            </li>
          ))
        );
      } else {
        function changeLayout(e) {
          if (e.target.width > e.target.height) {
            e.target.style.width = "100vw";
            e.target.parentElement.style.flexDirection = "column-reverse";
          }
        }

        if (value && this.state.pageOffset) {
          mangaElement.push(
            <li className="desktopManga" key={`${key}_0`}>
              <img
                key={`${key}_0`}
                page={`${key}_0`}
                src={value[0]}
                alt={value[0]}
                onLoad={changeLayout}
                style={{ width: "50vw" }}
              />
            </li>
          );
        }

        for (
          var i = this.state.pageOffset ? 1 : 0;
          i < value?.length;
          i = i + 2
        ) {
          mangaElement.push(
            <li className="desktopManga" key={`${key}_${i}`}>
              <img
                src={value[i + 1]}
                alt={value[i + 1]}
                onLoad={changeLayout}
                style={{ width: "50vw" }}
                key={`${key}_${i + 1}`}
                page={`${key}_${i + 1}`}
              />
              <img
                src={value[i]}
                alt={value[i]}
                style={{ width: "50vw" }}
                onLoad={changeLayout}
                key={`${key}_${i}`}
                page={`${key}_${i}`}
              />
            </li>
          );
        }
      }
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
        <Dialog message={this.state.message} />
        <div
          className="manga"
          ref={this.mangaRef}
          onTouchStart={(e) => {
            this.startX = undefined;
            const startX = e.touches[0].pageX;
            if (startX < 50 && e.touches[0].pageY < 850) {
              this.startX = startX;
              if (this.mangaRef.current) {
                this.mangaRef.current.style.transitionDuration = "0s";
              }
            }
          }}
          onTouchMove={(e) => {
            if (this.startX && this.mangaRef.current) {
              this.mangaRef.current.style.transform = `translateX(${
                e.touches[0].pageX - this.startX
              }px)`;
            }
          }}
          onTouchEnd={(e) => {
            this.mangaRef.current.style.transitionDuration = "0.3s";
            if (e.nativeEvent.pageX - this.startX > 100) {
              this.close();
            } else {
              this.mangaRef.current.style.transform = "translateX(0)";
            }
          }}
          style={{
            display: this.state.display,
            ...(this.state.show ? { transform: [`translateX(0px)`] } : {}),
          }}
        >
          <ul
            className="menu"
            style={{
              transform: [`translateY(${this.state.menu ? 0 : -100}%)`],
            }}
          >
            <li onClick={() => this.close()}>
              <Icon path={mdiChevronLeft} size={1.5} />
            </li>
            <li className="title">{title}</li>
            <li style={{ opacity: isPhone ? 0 : 1 }}>
              <span style={{ marginRight: "0.25rem" }}>封面頁</span>
              <Switch
                onChange={(v) => this.setState({ pageOffset: v })}
                checked={this.state.pageOffset}
                uncheckedIcon={false}
                checkedIcon={false}
                activeBoxShadow={null}
                onColor={"#000"}
                height={convertRemToPixels(1.5)}
                width={convertRemToPixels(3)}
              />
            </li>
          </ul>
          <div
            className="pageNumber"
            style={{
              transform: [`translateY(${this.state.menu ? 0 : 100}%)`],
            }}
          >
            <PageNumber
              total={this.urls[this.state.episode]?.length}
              episode={this.state.episode}
            />
          </div>

          <ul
            className="mangaImg"
            ref={this.mangaImgRef}
            onLoad={(e) => this.loadMore(e)}
            onScroll={(e) => this.loadMore(e)}
            onClick={() => this.setState({ menu: !this.state.menu })}
          >
            {mangaElement}
          </ul>
        </div>
      </>
    );
  }
}

export default Manga;
