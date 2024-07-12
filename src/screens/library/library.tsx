import "./library.scss";

import { Component, ReactNode } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { mdiChevronDown, mdiMagnify } from "@mdi/js";
import Icon from "@mdi/react";

import TopBar from "../../components/topBar/topBar";
import Driver, { Status } from "../../models/driver";
import {
  listenToEvents,
  RaitoEvents,
  RaitoSubscription,
} from "../../models/events";
import { SimpleManga } from "../../models/manga";
import {
  convertRemToPixels,
  wheelToScrollHorizontally,
} from "../../utils/utils";
import Search from "../search/search";
import makeSwipeable, {
  InjectedSwipeableProps,
} from "../swipeableScreen/swipeableScreen";
import MangasList from "../../components/mangasList/mangasList";

interface Props extends InjectedSwipeableProps, WithTranslation {}

const status = ["any", "onGoing", "ended"];

class Library extends Component<
  Props,
  { genre: string; status: Status; isLoading: boolean }
> {
  driver: string | undefined = undefined;
  state = { genre: "All", status: Status.Any, isLoading: false };
  content: HTMLDivElement | null = null;
  raitoSubscription: RaitoSubscription | null = null;

  componentDidMount() {
    // register for update events
    this.raitoSubscription = listenToEvents(
      [RaitoEvents.driverChanged],
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
      !this.state.isLoading &&
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
      this.state.isLoading ||
      !this.content
    )
      return;

    this.setState({ isLoading: true });

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

    this.setState({ isLoading: false }, () => {
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

  setContent(content: HTMLDivElement | null) {
    this.content = content;
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
            <ul onWheel={wheelToScrollHorizontally("UL")}>
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
        <MangasList
          setContent={this.setContent.bind(this)}
          shouldLoadMore={this.shouldLoadMore.bind(this)}
          manga={manga}
          isLoading={this.state.isLoading}
        />
      </div>
    );
  }
}

export default makeSwipeable(withTranslation()(Library));
