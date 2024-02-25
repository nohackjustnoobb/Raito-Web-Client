import "./library.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";
import { InfinitySpin } from "react-loader-spinner";

import { mdiChevronDown, mdiMagnify } from "@mdi/js";
import Icon from "@mdi/react";

import Driver, { Status } from "../../models/driver";
import RaitoEvent from "../../models/event";
import { SimpleManga } from "../../models/manga";
import LazyImage from "../../utils/lazyImage";
import TopBar from "../../utils/topBar";
import {
  convertRemToPixels,
  listenToEvents,
  RaitoSubscription,
} from "../../utils/utils";
import Search from "../search/search";
import makeSwipeable, {
  InjectedSwipeableProps,
} from "../swipeableScreen/swipeableScreen";

interface Props extends InjectedSwipeableProps, WithTranslation {}

const status = ["any", "onGoing", "ended"];

class Library extends Component<
  Props,
  { genre: string; status: Status; loading: boolean }
> {
  driver: string | undefined = undefined;
  state = { genre: "All", status: Status.Any, loading: false };
  content: HTMLDivElement | null = null;
  raitoSubscription: RaitoSubscription | null = null;

  componentDidMount() {
    // register for update events
    this.raitoSubscription = listenToEvents(
      [RaitoEvent.driverChanged],
      this.forceUpdate.bind(this)
    );
    this.forceUpdate();
  }

  componentDidUpdate() {
    // check if the driver is changed
    if (this.driver !== window.raito.selectedDriver?.identifier) {
      // scroll back to the top
      if (this.content) this.content.scrollTop = 0;

      if (
        !window.raito.selectedDriver?.supportedCategories.includes(
          this.state.genre
        )
      )
        this.setState({ genre: "All" });

      // update the cached driver
      this.driver = window.raito.selectedDriver?.identifier;
      this.forceUpdate();
      return;
    }

    // check if any manga fetched
    if (
      window.raito.selectedDriver &&
      !this.state.loading &&
      (!window.raito.selectedDriver.list[this.state.genre] ||
        !Object.keys(
          window.raito.selectedDriver.list[this.state.genre][this.state.status]
        ).length)
    )
      this.loadMore();
  }

  componentWillUnmount() {
    if (this.raitoSubscription) this.raitoSubscription.unsubscribe();
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

    this.setState({ loading: true });

    var reached: boolean = false;
    reached = !(await window.raito.selectedDriver!.getList(
      this.state.genre,
      this.state.status,
      window.raito.selectedDriver!.list[this.state.genre] &&
        window.raito.selectedDriver!.list[this.state.genre][this.state.status]
        ? Object.keys(
            window.raito.selectedDriver!.list[this.state.genre][
              this.state.status
            ]
          ).length + 1
        : 1
    ));

    this.setState({ loading: false }, () => {
      // check if scrollable
      if (!reached) this.shouldLoadMore();
    });
  }

  shouldLoadMore() {
    if (!this.content) return;

    // check if reached the bottom or not scrollable
    if (
      this.content.scrollHeight <=
      this.content.clientHeight + this.content.scrollTop + convertRemToPixels(1)
    )
      this.loadMore();
  }

  render(): ReactNode {
    var manga: Array<SimpleManga> = [];
    if (
      window.raito.selectedDriver &&
      window.raito.selectedDriver?.list[this.state.genre] &&
      window.raito.selectedDriver?.list[this.state.genre][this.state.status]
    ) {
      for (const page in window.raito.selectedDriver.list[this.state.genre][
        this.state.status
      ])
        window.raito.selectedDriver.list[this.state.genre][this.state.status][
          page
        ].forEach((v) =>
          manga.push(window.raito.selectedDriver!.simpleManga[v])
        );
    }

    return (
      <div className="library">
        <TopBar
          close={this.props.close}
          centerComponent={
            <div className="drivers">
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
              <Icon path={mdiChevronDown} size={1} />
            </div>
          }
          rightComponent={
            <div onClick={() => window.stack.push(<Search />)}>
              <Icon path={mdiMagnify} size={1} />
            </div>
          }
        />
        <div className="filters">
          <div className="filter">
            <h3>{this.props.t("genre")}: </h3>
            <ul>
              {window.raito.selectedDriver?.supportedCategories.map((v) => (
                <li
                  key={v}
                  className={v === this.state.genre ? "selected" : ""}
                  onClick={() => {
                    this.setState({ genre: v });
                    if (this.content) this.content.scrollTop = 0;
                  }}
                >
                  {this.props.t(v)}
                </li>
              ))}
            </ul>
          </div>
          <div className="filter">
            <h3>{this.props.t("status")}: </h3>
            <ul>
              {status.map((v, i) => (
                <li
                  key={v}
                  className={i === this.state.status ? "selected" : ""}
                  onClick={() => {
                    this.setState({ status: i });
                    if (this.content) this.content.scrollTop = 0;
                  }}
                >
                  {this.props.t(v)}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div
          className="content"
          ref={(ref) => (this.content = ref)}
          onScroll={() => this.shouldLoadMore()}
        >
          {manga.length === 0 && (
            <div className="empty">
              <span>
                {this.state.loading ? (
                  <InfinitySpin width="150" color="var(--color-text)" />
                ) : (
                  this.props.t("noMatchingManga")
                )}
              </span>
            </div>
          )}
          <div className="mangaList">
            {manga.map((manga, index) => (
              <div
                key={`${manga.driver.identifier}${manga.id}${index}`}
                onClick={() => manga.pushDetails()}
                className="manga"
              >
                {manga.isEnded && (
                  <div className="end">{this.props.t("ended")}</div>
                )}
                {window.raito.settingsState.debugMode && (
                  <>
                    <div className="mangaID">{manga.id}</div>
                  </>
                )}
                <LazyImage src={manga.thumbnail} />
                <p>{window.raito.translate(manga.title)}</p>
                <p className="latest">
                  {this.props.t("updatedTo")}{" "}
                  {window.raito.translate(manga.latest)}
                </p>
              </div>
            ))}
          </div>
          {this.state.loading && manga.length !== 0 && (
            <div className="spin">
              <InfinitySpin width="150" color="var(--color-text)" />
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default makeSwipeable(withTranslation()(Library));
