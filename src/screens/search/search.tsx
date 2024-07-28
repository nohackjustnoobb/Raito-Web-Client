import "./search.scss";

import { Component } from "react";

import { withTranslation, WithTranslation } from "react-i18next";

import { mdiMagnify } from "@mdi/js";
import Icon from "@mdi/react";

import DriverSelector from "../../components/driverSelector/driverSelector";
import MangasList from "../../components/mangasList/mangasList";
import TopBar from "../../components/topBar/topBar";
import driversManager from "../../managers/driversManager";
import {
  listenToEvents,
  RaitoEvents,
  RaitoSubscription,
} from "../../models/events";
import { Manga } from "../../models/manga";
import { convertRemToPixels, translate } from "../../utils/utils";
import makeSwipeable, {
  InjectedSwipeableProps,
} from "../swipeableScreen/swipeableScreen";

interface Props extends InjectedSwipeableProps, WithTranslation {
  keyword?: string;
}

interface State {
  keyword: string;
  isfocused: boolean;
  suggestions: Array<string> | null;
  isLoading: boolean;
}

class Search extends Component<Props, State> {
  state: State = {
    keyword: this.props.keyword || "",
    isfocused: false,
    isLoading: false,
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
      driversManager.selected &&
      this.driver !== driversManager.selected.identifier
    ) {
      this.driver = driversManager.selected.identifier;

      if (this.curSearch && !driversManager.selected.search[this.curSearch])
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
      !driversManager.selected ||
      driversManager.selected.isDown ||
      this.state.isLoading ||
      !this.content
    )
      return;

    this.setState({ isLoading: true });

    var reached: boolean = false;
    reached = !(await driversManager.selected!.getSearch(
      this.state.keyword,
      driversManager.selected!.search[this.state.keyword]
        ? Object.keys(driversManager.selected!.search[this.state.keyword])
            .length + 1
        : 1
    ));
    this.curSearch = this.state.keyword;

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

  render() {
    var manga: Array<Manga> = [];
    if (
      driversManager.selected &&
      this.curSearch &&
      driversManager.selected.search[this.curSearch]
    ) {
      for (const page in driversManager.selected.search[this.curSearch])
        driversManager.selected.search[this.curSearch][page].forEach((v) =>
          manga.push(driversManager.selected!.simpleManga[v])
        );
    }

    return (
      <div className="search">
        <TopBar close={this.props.close} centerComponent={<DriverSelector />} />
        <div className="searchBar">
          <input
            enterKeyHint="search"
            value={this.state.keyword}
            ref={(ref) => (this.searchInput = ref)}
            onFocus={() => this.setState({ isfocused: true })}
            onBlur={() =>
              setTimeout(() => this.setState({ isfocused: false }), 250)
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
                if (this.state.keyword && driversManager.selected)
                  this.setState({
                    suggestions: await driversManager.selected.getSuggestions(
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
            this.state.isfocused && (
              <ul className="suggestions">
                {this.state.suggestions!.map((suggestion) => (
                  <li
                    key={suggestion}
                    onClick={() => {
                      if (translate(suggestion)) {
                        this.setState(
                          {
                            keyword: translate(suggestion),
                          },
                          () => this.loadMore()
                        );
                      }
                    }}
                  >
                    <span>{translate(suggestion)}</span>
                  </li>
                ))}
              </ul>
            )}
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

export default makeSwipeable(withTranslation()(Search));
