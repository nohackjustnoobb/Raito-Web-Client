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
    const page =
      Number.parseInt(
        document
          .elementFromPoint(window.innerWidth * 0.5, window.innerHeight * 0.5)
          ?.firstChild?.getAttribute("page")
      ) + 1;

    if (page !== this.state.page) this.setState({ page: page });
  }

  componentDidMount() {
    this.interval = setInterval(() => this.updatePage(), 1000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  scrollTo(page) {
    const elem = document.elementFromPoint(
      window.innerWidth * 0.5,
      window.innerHeight * 0.5
    ).parentElement;

    if (elem) {
      elem.scrollTo({ top: elem?.scrollHeight * (page / this.props.total) });
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

class Manga extends React.Component {
  constructor(props) {
    super(props);

    this.urls = {};
    this.state = {
      episode: null,
      show: false,
      menu: true,
      pageOffset: false,
      loading: false,
      display: "none",
    };
  }

  close() {
    this.urls = {};
    this.manga = undefined;
    this.isExtra = undefined;

    this.setState({ show: false, pageOffset: false, menu: true });
    setTimeout(() => this.setState({ display: "none" }), 300);
  }

  loadMore(elem) {
    const convertRemToPixels = (rem) =>
      rem * parseFloat(getComputedStyle(document.documentElement).fontSize);

    if (elem?.scrollTop < convertRemToPixels(4)) {
      elem.scrollTo({ top: convertRemToPixels(4) });
    }

    if (
      elem?.scrollHeight - elem?.scrollTop - elem?.clientHeight <
      convertRemToPixels(4)
    ) {
      elem.scrollTo({
        top: elem.scrollHeight - elem.clientHeight - convertRemToPixels(4),
      });
    }
  }

  componentDidMount() {
    window.addEventListener("resize", () => this.forceUpdate());
    window.addEventListener("orientationchange", () => this.forceUpdate());

    window.read = async (manga, episode, isExtra) => {
      if (this.loading) return;
      this.loading = true;

      this.setState({ episode: episode, loading: true });

      this.start = episode;
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
    if (
      !window.betterMangaApp.forceTwoPage &&
      (window.betterMangaApp.forceOnePage || isPhone)
    ) {
      mangaElement = this.urls[this.state.episode]?.map((v, i) => (
        <li key={i}>
          <img src={v} alt={v} style={{ width: "100vw" }} key={i} page={i} />
        </li>
      ));
    } else {
      function changeLayout(e) {
        if (e.target.width > e.target.height) {
          e.target.style.width = "100vw";
          e.target.parentElement.style.flexDirection = "column-reverse";
        }
      }

      if (this.urls[this.state.episode] && this.state.pageOffset) {
        mangaElement.push(
          <li className="desktopManga" key={0}>
            <img
              key={0}
              page={0}
              src={this.urls[this.state.episode][0]}
              alt={this.urls[this.state.episode][0]}
              onLoad={changeLayout}
              style={{ width: "50vw" }}
            />
          </li>
        );
      }

      for (
        var i = this.state.pageOffset ? 1 : 0;
        i < this.urls[this.state.episode]?.length;
        i = i + 2
      ) {
        mangaElement.push(
          <li className="desktopManga" key={i}>
            <img
              src={this.urls[this.state.episode][i + 1]}
              alt={this.urls[this.state.episode][i + 1]}
              onLoad={changeLayout}
              style={{ width: "50vw" }}
              key={i + 1}
              page={i + 1}
            />
            <img
              src={this.urls[this.state.episode][i]}
              alt={this.urls[this.state.episode][i]}
              style={{ width: "50vw" }}
              onLoad={changeLayout}
              key={i}
              page={i}
            />
          </li>
        );
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
        <div
          className="manga"
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
            <PageNumber total={this.urls[this.state.episode]?.length} />
          </div>

          <ul
            className="mangaImg"
            ref={(ref) => this.loadMore(ref)}
            onScroll={() => this.forceUpdate()}
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
