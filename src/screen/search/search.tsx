import "./search.scss";

import { Component } from "react";

import { withTranslation, WithTranslation } from "react-i18next";
import { InfinitySpin } from "react-loader-spinner";

import { mdiChevronDown, mdiMagnify } from "@mdi/js";
import Icon from "@mdi/react";

import LazyImage from "../../components/lazyImage/lazyImage";
import TopBar from "../../components/topBar/topBar";
import Driver from "../../models/driver";
import {
  listenToEvents,
  RaitoEvents,
  RaitoSubscription,
} from "../../models/events";
import { SimpleManga } from "../../models/manga";
import { convertRemToPixels } from "../../utils/utils";
import makeSwipeable, {
  InjectedSwipeableProps,
} from "../swipeableScreen/swipeableScreen";

interface Props extends InjectedSwipeableProps, WithTranslation {
  keyword?: string;
}

interface State {
  keyword: string;
  focus: boolean;
  suggestions: Array<string> | null;
  loading: boolean;
}

class Search extends Component<Props, State> {
  state: State = {
    keyword: this.props.keyword || "",
    focus: false,
    loading: false,
    suggestions: null,
  };
  driver: string | null = null;
  timeoutId: NodeJS.Timeout | null = null;
  content: HTMLDivElement | null = null;
  searchInput: HTMLInputElement | null = null;
  curSearch: string | null = null;
  raitoSubscription: RaitoSubscription | null = null;

  componentDidMount() {
    // register for update events
    this.raitoSubscription = listenToEvents(
      [RaitoEvents.driverChanged],
      this.forceUpdate.bind(this)
    );

    if (this.props.keyword) this.loadMore();
  }

  componentDidUpdate() {
    if (
      window.raito.selectedDriver &&
      this.driver !== window.raito.selectedDriver.identifier
    ) {
      this.driver = window.raito.selectedDriver.identifier;

      if (this.curSearch && !window.raito.selectedDriver.search[this.curSearch])
        this.loadMore();
    }
  }

  componentWillUnmount() {
    if (this.raitoSubscription) this.raitoSubscription.unsubscribe();
  }

  // show loader when loading list
  async loadMore() {
    if (this.searchInput) this.searchInput.blur();

    if (
      !window.raito.selectedDriver ||
      window.raito.selectedDriver.isDown ||
      this.state.loading ||
      !this.content
    )
      return;

    this.setState({ loading: true });

    var reached: boolean = false;
    reached = !(await window.raito.selectedDriver!.getSearch(
      this.state.keyword,
      window.raito.selectedDriver!.search[this.state.keyword]
        ? Object.keys(window.raito.selectedDriver!.search[this.state.keyword])
            .length + 1
        : 1
    ));
    this.curSearch = this.state.keyword;

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

  render() {
    var manga: Array<SimpleManga> = [];
    if (
      window.raito.selectedDriver &&
      this.curSearch &&
      window.raito.selectedDriver.search[this.curSearch]
    ) {
      for (const page in window.raito.selectedDriver.search[this.curSearch])
        window.raito.selectedDriver.search[this.curSearch][page].forEach((v) =>
          manga.push(window.raito.selectedDriver!.simpleManga[v])
        );
    }

    return (
      <div className="search">
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
        />
        <div className="searchBar">
          <input
            enterKeyHint="search"
            value={this.state.keyword}
            ref={(ref) => (this.searchInput = ref)}
            onFocus={() => this.setState({ focus: true })}
            onBlur={() =>
              setTimeout(() => this.setState({ focus: false }), 250)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") this.loadMore();
            }}
            onChange={(event) => {
              // set the search text
              this.setState({ keyword: event.target.value });
              // reset the timeout
              if (this.timeoutId !== null) clearTimeout(this.timeoutId);

              // set timeout
              this.timeoutId = setTimeout(async () => {
                if (this.state.keyword && window.raito.selectedDriver)
                  this.setState({
                    suggestions:
                      await window.raito.selectedDriver.getSuggestions(
                        this.state.keyword
                      ),
                  });
              }, 500);
            }}
          />
          <div className="icon" onClick={() => this.loadMore()}>
            <Icon path={mdiMagnify} size={1} color={"#999999"} />
          </div>
          {this.state.suggestions &&
            this.state.suggestions.length !== 0 &&
            this.state.focus && (
              <ul className="suggestions">
                {this.state.suggestions!.map((suggestion) => (
                  <li
                    key={suggestion}
                    onClick={() => {
                      if (window.raito.translate(suggestion)) {
                        this.setState(
                          {
                            keyword: window.raito.translate(suggestion),
                          },
                          () => this.loadMore()
                        );
                      }
                    }}
                  >
                    <span>{window.raito.translate(suggestion)}</span>
                  </li>
                ))}
              </ul>
            )}
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
                <div className="tag">
                  {manga.isEnded && (
                    <div className="end">{this.props.t("end")}</div>
                  )}
                  {window.raito.settingsState.debugMode && (
                    <>
                      <div className="driverID">{manga.driver.identifier}</div>
                      <div className="mangaID">{manga.id}</div>
                    </>
                  )}
                </div>
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

export default makeSwipeable(withTranslation()(Search));
